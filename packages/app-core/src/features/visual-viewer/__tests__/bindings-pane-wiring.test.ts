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

        it('leaves the step marks off a slider that has too many steps to show them', () => {
            expect(controlSource).toMatch(
                /stepCount > MAX_STEP_MARKS[\s\S]*?className:\s*classes\.rangeRailWithoutStepMarks/
            );
        });

        it('takes the limits of a slider from the value its signal is defined with', () => {
            expect(controlSource).toMatch(
                /getRangeAttributes\(\s*bind,\s*value,\s*boundSignal\.value\s*\)/
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

        it('keeps the text inside a dropdown and a text input in the theme colour, whatever the text colour setting', () => {
            expect(
                controlSource.match(
                    /style=\{BINDINGS_FIELD_STYLE as CSSProperties\}/g
                )
            ).toHaveLength(2);
            expect(controlSource).toMatch(
                /<Select\b[^>]*?style=\{BINDINGS_FIELD_STYLE as CSSProperties\}/
            );
            expect(controlSource).toMatch(
                /<Input\b[^>]*?style=\{BINDINGS_FIELD_STYLE as CSSProperties\}/
            );
        });

        it('names every kind of control with a field label, so that every row reads the same way', () => {
            expect(
                controlSource.match(/<Field \{\.\.\.field\}>/g)
            ).toHaveLength(6);
            expect(controlSource).not.toMatch(/<Checkbox\b[^>]*?\blabel=/);
        });

        it('puts each label where the pane asks for it, and keeps a label that sits beside its control level with it', () => {
            expect(controlSource).toMatch(/orientation: fieldOrientation\b/);
            expect(controlSource).toMatch(
                /rowWithLabelBeside: \{[^}]*alignItems: 'center'[^}]*gridTemplateRows: 'auto'[^}]*\}/
            );
            expect(controlSource).toMatch(
                /fieldOrientation === 'horizontal' &&\s*classes\.rowWithLabelBeside/
            );
        });

        it('keeps a row inside the pane: a control shrinks to the width of its row, a long word wraps, and the options of a radio group wrap', () => {
            expect(controlSource).toMatch(
                /row: \{\s*'> \*': \{\s*minWidth: 0\s*\}\s*\}/
            );
            expect(controlSource).toMatch(/mergeClasses\(\s*classes\.row,/);
            expect(controlSource).toMatch(
                /label: \{ children: label, className: classes\.label \}/
            );
            expect(controlSource).toMatch(
                /label: \{[^}]*overflowWrap: 'anywhere'[^}]*\}/
            );
            expect(controlSource).toMatch(
                /radioLabel: \{[^}]*overflowWrap: 'anywhere'[^}]*\}/
            );
            expect(controlSource).toMatch(
                /radios: \{[^}]*flexWrap: 'wrap'[^}]*\}/
            );
            expect(controlSource).toMatch(
                /<RadioGroup\b[^>]*?className=\{classes\.radios\}/
            );
        });

        it('lets a slider give way in a row that is narrower than it', () => {
            expect(controlSource).toMatch(
                /rangeSlider: \{[^}]*minWidth: 0[^}]*width: SLIDER_WIDTH[^}]*\}/
            );
            expect(controlSource).toMatch(
                /<Slider\b[^>]*?className=\{classes\.rangeSlider\}/
            );
            expect(controlSource).toMatch(
                /rangeValue: \{[^}]*flexShrink: 0[^}]*\}/
            );
        });

        it('starts a checkbox and a radio group where the other controls start, in a row as tall as theirs', () => {
            expect(controlSource).toMatch(
                /checkbox: \{[^}]*marginLeft: INDICATOR_OFFSET[^}]*\}/
            );
            expect(controlSource).toMatch(
                /radios: \{[^}]*marginLeft: INDICATOR_OFFSET[^}]*\}/
            );
            expect(controlSource).toMatch(
                /const INDICATOR_OFFSET = `calc\(-1 \* \$\{INDICATOR_SPACE\}\)`;/
            );
            expect(controlSource).toMatch(
                /checkboxIndicator: \{[^}]*marginLeft: INDICATOR_SPACE[^}]*\}/
            );
            expect(controlSource).toMatch(
                /radioIndicator: \{[^}]*marginLeft: INDICATOR_SPACE[^}]*\}/
            );
            expect(controlSource).toMatch(
                /<Checkbox\b[^>]*?className=\{classes\.checkbox\}/
            );
            expect(controlSource).toMatch(
                /<Checkbox\b[^>]*?indicator=\{\{\s*className: classes\.checkboxIndicator\s*\}\}/
            );
            expect(controlSource).toMatch(
                /<Radio\b[^>]*?indicator=\{\{\s*className: classes\.radioIndicator\s*\}\}/
            );
        });

        it('keeps the hidden input of a checkbox inside the checkbox, where it cannot make a narrow pane scroll sideways', () => {
            expect(controlSource).toMatch(/checkboxInput: \{\s*width: `calc\(/);
            expect(controlSource).toContain(
                '`calc(${INDICATOR_SIZE} + 2 * ${INDICATOR_SPACE})`'
            );
            expect(controlSource).toMatch(
                /<Checkbox\b[^>]*?input=\{\{\s*className: classes\.checkboxInput\s*\}\}/
            );
        });

        it('makes a radio button as tall as its option at any font size, with its circle on the first line, so that the lines of a wrapped group stay apart', () => {
            expect(controlSource).toContain(
                '`calc(${INDICATOR_SPACE} + (${tokens.lineHeightBase200} - ${INDICATOR_SIZE}) / 2)`'
            );
            expect(controlSource).toMatch(
                /radioIndicator: \{[^}]*marginBottom: RADIO_INDICATOR_MARGIN[^}]*marginTop: RADIO_INDICATOR_MARGIN[^}]*\}/
            );
            expect(controlSource).toMatch(
                /radioLabel: \{[^}]*marginBottom: 0[^}]*marginTop: 0[^}]*\}/
            );
        });

        it('shows the options of a radio group and the value of a slider at the size of the labels', () => {
            expect(controlSource).toMatch(
                /className: classes\.radioLabel,\s*size: 'small'/
            );
            expect(controlSource).toMatch(
                /rangeValue: \{[^}]*fontSize: tokens\.fontSizeBase200,/
            );
        });

        it('lets a dropdown grow with its text, from the height Fluent gives it at the default size', () => {
            expect(controlSource).toMatch(
                /selectGrowingWithText: \{\s*height: 'auto',\s*minHeight: SMALL_SELECT_HEIGHT\s*\}/
            );
            expect(controlSource).toMatch(
                /<Select\b[^>]*?select=\{\{ className: classes\.selectGrowingWithText \}\}/
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

        it('gives each signal a row of its own on every edge', () => {
            expect(paneSource).toMatch(
                /controls: \{[^}]*flexDirection: 'column'[^}]*\}/
            );
            expect(paneSource).not.toMatch(/flexWrap/);
        });

        it('puts each label beside its control when the pane runs along the width, and above it when the controls are stacked along the height', () => {
            expect(paneSource).toMatch(
                /fieldOrientation=\{\s*runsAlongWidth \? 'horizontal' : 'vertical'\s*\}/
            );
        });

        it('separates stacked rows by more than the space between a label and its control', () => {
            expect(paneSource).toMatch(
                /controlsAlongHeight: \{[^}]*rowGap: tokens\.spacingVerticalM[^}]*\}/
            );
            expect(paneSource).toMatch(
                /controlsAlongWidth: \{[^}]*rowGap: tokens\.spacingVerticalXS[^}]*\}/
            );
        });

        it('holds the rows to a width that keeps each label near its control, with the toggle at the far end of the pane', () => {
            expect(paneSource).toMatch(
                /controlsAlongWidth: \{[^}]*maxWidth: ROW_MAXIMUM_WIDTH[^}]*\}/
            );
            expect(paneSource).toMatch(
                /toggleAlongWidth: \{ marginLeft: 'auto' \}/
            );
            expect(paneSource).toMatch(
                /runsAlongWidth\s*\? classes\.toggleAlongWidth\s*: classes\.toggleAlongHeight/
            );
        });

        it('keeps one root and one toggle for both states, so the toggle keeps keyboard focus', () => {
            expect(paneSource.match(/<FluentProvider\b/g)).toHaveLength(1);
            expect(paneSource.match(/<Button\b/g)).toHaveLength(1);
        });

        it('puts the toggle where the Tab key reaches it in the order it is drawn: before stacked controls and after controls that run along the width', () => {
            expect(paneSource).toMatch(
                /\{!runsAlongWidth && toggle\}\s*\{!isCollapsed && \([\s\S]*?\{runsAlongWidth && toggle\}/
            );
            expect(paneSource).not.toMatch(/order: -1/);
        });

        it('puts the toggle of a collapsed pane in the corner nearest its edge', () => {
            expect(paneSource).toMatch(
                /collapsedCornerClasses\[getCollapsedToggleCorner\(orient\)\]/
            );
            expect(paneSource).toMatch(
                /bottomRight: classes\.collapsedAtBottomRight\b/
            );
            expect(paneSource).toMatch(
                /topRight: classes\.collapsedAtTopRight\b/
            );
            expect(paneSource).toMatch(
                /topLeft: classes\.collapsedAtTopLeft\b/
            );
        });

        it('draws the border on the side of the pane that faces the chart', () => {
            const expectations = [
                { orient: 'bottom', className: 'borderForBottom', side: 'Top' },
                { orient: 'top', className: 'borderForTop', side: 'Bottom' },
                { orient: 'left', className: 'borderForLeft', side: 'Right' },
                { orient: 'right', className: 'borderForRight', side: 'Left' }
            ];
            for (const { orient, className, side } of expectations) {
                expect(paneSource).toMatch(
                    new RegExp(`\\b${orient}: classes\\.${className}\\b`)
                );
                expect(paneSource).toMatch(
                    new RegExp(
                        `${className}: \\{\\s*border${side}Color: BORDER_COLOR,\\s*border${side}Style: 'solid',\\s*border${side}Width: tokens\\.strokeWidthThin\\s*\\}`
                    )
                );
            }
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

        it('lets both kinds of scroll container give up space to an inline pane', () => {
            expect(
                viewerSource.match(/hasInlinePane && inlineContainerClass/g)
            ).toHaveLength(2);
        });

        it('gives up height to a pane that runs along the width, and width to a pane stacked along the height', () => {
            expect(viewerSource).toMatch(
                /const paneRunsAlongWidth = isPaneAlongWidth\(bindingsSettings\.orient\);/
            );
            expect(viewerSource).toMatch(
                /const inlineContainerClass = paneRunsAlongWidth\s*\?\s*classes\.containerGivingUpHeight\s*:\s*classes\.containerGivingUpWidth;/
            );
        });

        it('lays the pane out on its own edge of the chart', () => {
            const expectations = [
                {
                    orient: 'bottom',
                    className: 'layoutPaneAtBottom',
                    flexDirection: 'column'
                },
                {
                    orient: 'top',
                    className: 'layoutPaneAtTop',
                    flexDirection: 'column-reverse'
                },
                {
                    orient: 'right',
                    className: 'layoutPaneAtRight',
                    flexDirection: 'row'
                },
                {
                    orient: 'left',
                    className: 'layoutPaneAtLeft',
                    flexDirection: 'row-reverse'
                }
            ];
            for (const { orient, className, flexDirection } of expectations) {
                expect(viewerSource).toMatch(
                    new RegExp(`\\b${orient}: classes\\.${className}\\b`)
                );
                expect(viewerSource).toMatch(
                    new RegExp(
                        `${className}: \\{ flexDirection: '${flexDirection}' \\}`
                    )
                );
            }
        });

        it('uses the box-less layout whenever there is no pane', () => {
            expect(viewerSource).toMatch(
                /hasBindingsPane\s*\?\s*mergeClasses\(\s*classes\.layoutWithPane,[^)]*\)\s*:\s*classes\.layoutWithoutPane/
            );
        });

        it('generates no layout box when there is no pane', () => {
            expect(viewerSource).toMatch(
                /layoutWithoutPane: \{ display: 'contents' \}/
            );
        });
    });

    describe('settings', () => {
        const viewerSource = read('components', 'visual-viewer.tsx');
        const paneSource = read(
            'components',
            'bindings-pane',
            'bindings-pane.tsx'
        );

        it('passes the parsed settings from the compile result to the pane', () => {
            expect(viewerSource).toMatch(
                /state\.compilation\.result\?\.parsed\.bindingsSettings \?\?\s*DEFAULT_BINDINGS_SETTINGS/
            );
            expect(viewerSource).toMatch(/settings=\{bindingsSettings\}/);
        });

        it('takes no space from the scroll container when the pane floats', () => {
            expect(viewerSource).toMatch(
                /const hasInlinePane = hasBindingsPane && !bindingsSettings\.float;/
            );
            expect(paneSource.match(/classes\.float\b/g)).toHaveLength(1);
            expect(paneSource).toMatch(/settings\.float && classes\.float\b/);
        });

        it('resolves the collapsed state and the theme from the settings, building the theme again only when a style setting changes', () => {
            expect(paneSource).toMatch(/resolveIsPaneCollapsed\(/);
            expect(paneSource).toMatch(
                /const \{ fontFamily, fontSize, color, accentColor \} = settings;/
            );
            expect(paneSource).toMatch(
                /useMemo\(\s*\(\) =>\s*getBindingsTheme\(\{ fontFamily, fontSize, color, accentColor \}\),\s*\[fontFamily, fontSize, color, accentColor\]\s*\)/
            );
        });

        it('records the choice of the reader when the toggle is used', () => {
            expect(paneSource).toMatch(/setPaneCollapseChoice\(!isCollapsed\)/);
        });

        it('keeps the toggle at its own size when the controls overflow the pane', () => {
            expect(paneSource).toMatch(/toggle: \{ flexShrink: 0 \}/);
            expect(paneSource).toMatch(
                /<Button\s+className=\{mergeClasses\(\s*classes\.toggle,/
            );
        });
    });
});
