// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT } from './_packages';

/**
 * Canary: the visual's entry (`src/index.ts`) stays composition-only —
 * lifecycle logic lives in the kernel base class, and the entry forwards
 * options plus its config to it.
 */

describe('the entry is composition-only', () => {
    const entrySource = readFileSync(join(APP_ROOT, 'src', 'index.ts'), 'utf8');

    it('exports `class Deneb extends VisualKernel`', () => {
        expect(entrySource).toMatch(/class Deneb extends VisualKernel/);
    });

    it('contains no dataset-resolution dispatch logic', () => {
        expect(entrySource).not.toContain('resolveDatasetUpdateAction');
    });

    it('contains no safety-net wiring', () => {
        expect(entrySource).not.toContain('SAFETY_NET');
    });

    it('contains no teardown logic', () => {
        expect(entrySource).not.toContain('destroy(');
    });

    it('does not call the editor state install directly', () => {
        expect(entrySource).not.toContain('installEditorState(');
    });
});
