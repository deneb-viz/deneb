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
                /import \{\s*bindEmbeddedView,\s*patchCompiledSpecForBindings\s*\} from '\.\.\/bindings-embed';/
            );
            expect(embedSource).toMatch(
                /patch: patchCompiledSpecForBindings\b/
            );
        });

        it('does not build a patch function in the component, where its identity would change on every render', () => {
            expect(embedSource).not.toMatch(/patch: \(/);
            expect(embedSource).not.toMatch(/patch: use/);
        });

        it('binds each new view in the embed callback, after the view services and before the view context', () => {
            const handleEmbedStart = embedSource.indexOf(
                'const handleEmbed = useCallback('
            );
            const handleEmbedEnd = embedSource.indexOf(
                'const handleError = useCallback('
            );
            const servicesBind = embedSource.indexOf(
                'VegaViewServices.bind(result.view);'
            );
            const bindingsBind = embedSource.indexOf(
                'bindEmbeddedView(result.view, result.vgSpec);'
            );
            const contextSet = embedSource.indexOf('setView(result.view);');
            expect(handleEmbedStart).toBeGreaterThan(-1);
            expect(servicesBind).toBeGreaterThan(handleEmbedStart);
            expect(bindingsBind).toBeGreaterThan(servicesBind);
            expect(contextSet).toBeGreaterThan(bindingsBind);
            expect(handleEmbedEnd).toBeGreaterThan(contextSet);
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

        it('attaches with the bound signals the view was built from, not those of the latest compile', () => {
            expect(hookSource).toMatch(/getViewBoundSignals\(view\)/);
            expect(hookSource).not.toMatch(/parsed\.boundSignals/);
        });

        it('releases its listeners when the view changes', () => {
            expect(hookSource).toMatch(/session\.dispose\(\)/);
            expect(hookSource).toMatch(/\}, \[isActive, view\]\);/);
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

        it('gives the colour input a value it can show', () => {
            expect(controlSource).toMatch(
                /type='color'[\s\S]*?value=\{getColorInputValue\(value\)\}/
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

        it('runs the session from the live flag alone', () => {
            expect(paneSource).toMatch(/useBoundSignalSession\(isActive\)/);
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

    describe('viewer layout', () => {
        const viewerSource = read('components', 'visual-viewer.tsx');

        it('renders a pane only for the live instance, and only when there are bound signals', () => {
            expect(viewerSource).toMatch(
                /const hasBindingsPane = isActive && boundSignals\.length > 0;/
            );
        });

        it('renders the pane beside the scroll container, never inside it', () => {
            expect(viewerSource).toMatch(
                /\{scrollContainer\}\s*\{hasBindingsPane && \([\s\S]*?<VegaEmbedErrorBoundary\b[^>]*>\s*<BindingsPane/
            );
            const declared = viewerSource.indexOf('const scrollContainer =');
            const used = viewerSource.indexOf('{scrollContainer}');
            expect(declared).toBeGreaterThan(-1);
            expect(used).toBeGreaterThan(declared);
            expect(viewerSource.slice(declared, used)).not.toContain(
                '<BindingsPane'
            );
        });

        it('keeps a pane that throws from taking the chart down, and retries when the bound signals are redefined', () => {
            expect(viewerSource).toMatch(
                /<VegaEmbedErrorBoundary key=\{bindingsPaneKey\}>\s*<BindingsPane\b/
            );
            expect(viewerSource).toMatch(
                /bindingsPaneKey = boundSignals\s*\.map\(\(boundSignal\) => boundSignal\.key\)/
            );
        });

        it('renders exactly one pane', () => {
            expect(viewerSource.match(/<BindingsPane\b/g)).toHaveLength(1);
        });

        it('lets both kinds of scroll container give up height to the pane', () => {
            expect(
                viewerSource.match(
                    /hasBindingsPane && classes\.containerBesidePane/g
                )
            ).toHaveLength(2);
        });

        it('uses the box-less layout whenever there is no pane', () => {
            expect(viewerSource).toMatch(
                /hasBindingsPane\s*\?\s*classes\.layoutWithPane\s*:\s*classes\.layoutWithoutPane/
            );
        });

        it('generates no layout box when there is no pane', () => {
            expect(viewerSource).toMatch(
                /layoutWithoutPane: \{ display: 'contents' \}/
            );
        });
    });
});
