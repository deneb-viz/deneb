// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { getNewCreateFromTemplateSliceProperties } from '@deneb-viz/json-processing';
import { isCreatePending } from '../pending';

const TEMPLATE_SPEC = '{"mark": "bar"}';

describe('isCreatePending', () => {
    it('is pending once the store holds a spec the host has not sent back yet', () => {
        expect(isCreatePending(TEMPLATE_SPEC, PROJECT_DEFAULTS.spec)).toBe(
            true
        );
        expect(isCreatePending(TEMPLATE_SPEC, undefined)).toBe(true);
    });

    it('is not pending while importing, before anything is created', () => {
        expect(
            isCreatePending(PROJECT_DEFAULTS.spec, PROJECT_DEFAULTS.spec)
        ).toBe(false);
        expect(isCreatePending(undefined, PROJECT_DEFAULTS.spec)).toBe(false);
    });

    it('is not pending once the host has sent the saved template back', () => {
        expect(isCreatePending(TEMPLATE_SPEC, TEMPLATE_SPEC)).toBe(false);
    });
});

describe('create surface composition', () => {
    const surfaceSource = readFileSync(
        join(__dirname, '..', 'components', 'create-surface.tsx'),
        'utf8'
    );
    const contentSource = readFileSync(
        join(__dirname, '..', 'components', 'import-content.tsx'),
        'utf8'
    );
    const dialogSource = readFileSync(
        join(__dirname, '..', 'components', 'import-dialog.tsx'),
        'utf8'
    );
    const appSource = readFileSync(
        join(__dirname, '..', '..', '..', 'app', 'app.tsx'),
        'utf8'
    );

    it('starts the create slice in import mode', () => {
        expect(getNewCreateFromTemplateSliceProperties().mode).toBe('import');
    });

    it("composes app-core's import and placeholder pieces for both the dialog and the tile", () => {
        expect(contentSource).toContain('<ImportDropzone />');
        expect(contentSource).toContain('<CreateFromTemplate />');
        expect(dialogSource).toContain('<ImportContent');
        expect(surfaceSource).toContain(
            '<ImportContent footer={<CreateButton />} />'
        );
    });

    it('keeps the footer buttons outside the scrolling content', () => {
        const contentEnd = contentSource.indexOf(
            '<div className={classes.footer}>{footer}</div>'
        );
        expect(contentEnd).toBeGreaterThan(-1);
        expect(contentSource.slice(0, contentEnd)).toContain(
            '<CreateFromTemplate />'
        );
    });

    it('offers no create-method choice and no template catalog', () => {
        for (const source of [surfaceSource, contentSource, dialogSource]) {
            expect(source).not.toMatch(/CreateMethod|SelectIncludedTemplate/);
        }
    });

    it('imports in a dialog where Power BI allows one, and in the tile otherwise', () => {
        expect(surfaceSource).toMatch(
            /host\.hostCapabilities\?\.allowModalDialog \? \(\s*<ImportPrompt host=\{host\} \/>\s*\) : \(\s*<ImportContent footer=\{<CreateButton \/>\} \/>/
        );
    });

    it('saves a created template through the host persistence callback, from the dialog or the tile', () => {
        expect(surfaceSource).toMatch(
            /onCreateProject:\s*persistOnCreateFromTemplate/
        );
        expect(appSource).toMatch(
            /onCreateProject:\s*persistOnCreateFromTemplate/
        );
    });

    it('shows a pending state instead of the import surface while a create is in flight', () => {
        expect(appSource).toMatch(
            /isCreatePending\(storeSpec, persistedSpec\)\s*\?\s*\(\s*<SplashInitial \/>/
        );
    });
});
