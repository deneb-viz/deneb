import type { SectionId } from './types';

/**
 * Static schema describing a single row within a flat (non-dataset)
 * section. Schemas hold i18n keys only — no resolved strings — so they
 * can be module-scope constants and remain locale-agnostic.
 */
export type SectionRowSchema = {
    /** Stable row id (kebab-case). Used as the key in `SectionMatchView.rows`. */
    id: string;
    /** i18n key whose translation is the row's primary label. */
    labelKey: string;
    /**
     * Optional i18n key whose translation is the row's assistive /
     * info-label text. Omit when the row has no secondary text.
     */
    assistiveKey?: string;
};

/**
 * Static schema describing a single flat section in the settings pane.
 */
export type SectionSchema = {
    id: Exclude<SectionId, 'dataset'>;
    headingKey: string;
    rows: readonly SectionRowSchema[];
};
