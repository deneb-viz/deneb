import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural canary for the bindings pane. Component render tests are not
 * run in this workspace, so the logic is tested in the functions the
 * components call, and this locks how they are wired together.
 */
const read = (...segments: string[]) =>
    readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('bindings pane wiring', () => {
    describe('embed patch', () => {
        const embedSource = read('components', 'vega-embed.tsx');

        it('passes the module-level patch function to vega-embed', () => {
            expect(embedSource).toMatch(
                /import \{ patchCompiledSpecForBindings \} from '\.\.\/bindings-embed-patch';/
            );
            expect(embedSource).toMatch(
                /patch: patchCompiledSpecForBindings\b/
            );
        });

        it('does not build a patch function in the component, where its identity would change on every render', () => {
            expect(embedSource).not.toMatch(/patch: \(/);
            expect(embedSource).not.toMatch(/patch: use/);
        });
    });
});
