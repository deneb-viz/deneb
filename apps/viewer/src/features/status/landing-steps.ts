import { type LandingPageStep } from '@deneb-viz/powerbi-host';

/** The surfaces the landing page is shown for. */
export type LandingSurface = 'add-fields' | 'create' | 'landing';

type LandingStepsInput = {
    surface: LandingSurface;
    /** Whether the report is being read, so nothing can be set up. */
    readMode: boolean;
    /** Whether the visual holds a saved template. */
    hasTemplate: boolean;
};

/** How the landing page's two setup cards and the import action show. */
export type LandingSteps = {
    /** The Add your data card's step; none for readers. */
    addData?: LandingPageStep;
    /** The Import a template card's step; none for readers. */
    importTemplate?: LandingPageStep;
    /** Which Add your data body to show. */
    addDataBody: 'default' | 'template-saved';
    /** Whether the Import a template card offers the import action. */
    showImport: boolean;
};

/**
 * Resolves where an author is in setting the visual up.
 *
 * - Readers see the page with no steps and no action: they can't set the
 *   visual up.
 * - An author with fields but no template is on the import step.
 * - Otherwise the author needs fields. A saved template marks the import as
 *   done and changes the wording. This also covers an author who reaches the
 *   `landing` surface as a fallback, so they never get the reader's page.
 */
export const resolveLandingSteps = ({
    surface,
    readMode,
    hasTemplate
}: LandingStepsInput): LandingSteps => {
    if (readMode) {
        return { addDataBody: 'default', showImport: false };
    }
    if (surface === 'create') {
        return {
            addData: 'done',
            importTemplate: 'current',
            addDataBody: 'default',
            showImport: true
        };
    }
    return {
        addData: 'current',
        importTemplate: hasTemplate ? 'done' : 'upcoming',
        addDataBody: hasTemplate ? 'template-saved' : 'default',
        showImport: false
    };
};
