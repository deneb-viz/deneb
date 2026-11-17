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

    describe('session hook', () => {
        const hookSource = read(
            'components',
            'bindings-pane',
            'use-bound-signal-session.ts'
        );

        it('attaches to the view of its own viewer instance, and only when that instance is live', () => {
            expect(hookSource).toMatch(/useVegaView\(\)/);
            expect(hookSource).toMatch(/if \(!isActive \|\| view === null/);
            expect(hookSource).toMatch(/attachBoundSignals\(\{/);
        });

        it('releases its listeners when the view or the bound signals change', () => {
            expect(hookSource).toMatch(/session\.dispose\(\)/);
            expect(hookSource).toMatch(
                /\}, \[isActive, view, boundSignals\]\);/
            );
        });

        it('holds a new value before writing it, and writes only to a ready view', () => {
            expect(hookSource).toMatch(
                /setHeldValue\([\s\S]*?\);\s*if \(state\.compilation\.viewReady\)/
            );
        });
    });

    describe('controls', () => {
        const controlSource = read(
            'components',
            'bindings-pane',
            'binding-control.tsx'
        );

        it('writes the option itself for a radio group and a select, not its position', () => {
            expect(
                controlSource.match(
                    /onChange\(\s*boundSignal,\s*getOptionAtIndex\(bind, data\.value\)\s*\)/g
                )
            ).toHaveLength(2);
        });

        it('writes a boolean for a checkbox', () => {
            expect(controlSource).toMatch(
                /onChange\(boundSignal, data\.checked === true\)/
            );
        });

        it('shows no option as chosen when the signal value matches none', () => {
            expect(controlSource).toMatch(
                /selectedIndex < 0 && <option value='' \/>/
            );
        });
    });

    describe('pane', () => {
        const paneSource = read(
            'components',
            'bindings-pane',
            'bindings-pane.tsx'
        );

        it('shows each control the held value for its signal', () => {
            expect(paneSource).toMatch(
                /getHeldValue\(boundSignal, heldValues\)/
            );
        });

        it('keeps the session running while collapsed, by calling the hook before any early return', () => {
            const hookCall = paneSource.indexOf('useBoundSignalSession(');
            const firstReturn = paneSource.indexOf('return (');
            expect(hookCall).toBeGreaterThan(-1);
            expect(hookCall).toBeLessThan(firstReturn);
        });
        it('keeps one root and one toggle for both states, so the toggle keeps keyboard focus', () => {
            expect(paneSource.match(/<FluentProvider\b/g)).toHaveLength(1);
            expect(paneSource.match(/<Button\b/g)).toHaveLength(1);
        });
    });
});
