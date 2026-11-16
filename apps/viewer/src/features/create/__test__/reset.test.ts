// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { isTemplateReset } from '../reset';

const DEFAULT = PROJECT_DEFAULTS.spec;
const TEMPLATE = '{"mark": "bar"}';
const OTHER_TEMPLATE = '{"mark": "line"}';

describe('isTemplateReset', () => {
    it('detects the saved template being removed', () => {
        expect(isTemplateReset(TEMPLATE, DEFAULT)).toBe(true);
    });

    it('ignores an unfinished import, where nothing has been saved', () => {
        expect(isTemplateReset(DEFAULT, DEFAULT)).toBe(false);
    });

    it('ignores the host echoing a newly created template', () => {
        expect(isTemplateReset(DEFAULT, TEMPLATE)).toBe(false);
    });

    it('ignores the first saved value of a visual, template or not', () => {
        expect(isTemplateReset(undefined, DEFAULT)).toBe(false);
        expect(isTemplateReset(undefined, TEMPLATE)).toBe(false);
    });

    it('does not treat one template replacing another as a reset', () => {
        expect(isTemplateReset(TEMPLATE, OTHER_TEMPLATE)).toBe(false);
    });

    it('ignores a missing saved value', () => {
        expect(isTemplateReset(TEMPLATE, undefined)).toBe(false);
    });
});

describe('reset wiring', () => {
    const appSource = readFileSync(
        join(__dirname, '..', '..', '..', 'app', 'app.tsx'),
        'utf8'
    );

    it('clears the import surface back to an empty import on a reset', () => {
        expect(appSource).toMatch(
            /if \(isTemplateReset\(previousPersistedSpec\.current, persistedSpec\)\) \{\s*resetImport\('import'\);/
        );
    });

    it('records every distinct saved value as the next baseline', () => {
        expect(appSource).toContain(
            'previousPersistedSpec.current = persistedSpec;'
        );
    });
});
