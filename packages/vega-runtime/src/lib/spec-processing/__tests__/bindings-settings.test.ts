import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    DEFAULT_BINDINGS_SETTINGS,
    extractBindingsSettings,
    type ColorValidator
} from '../bindings-settings';

const acceptAnyColor = () => true;
const rejectAnyColor = () => false;

const withBindings = (bindings: unknown) => ({ deneb: { bindings } });

describe('extractBindingsSettings', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the defaults and the same config when there is no deneb key', () => {
        const config = { background: 'transparent' };
        const result = extractBindingsSettings(config);
        expect(result.settings).toBe(DEFAULT_BINDINGS_SETTINGS);
        expect(result.config).toBe(config);
        expect(result.warnings).toEqual([]);
    });

    it('removes the deneb key from the config that is passed on', () => {
        const result = extractBindingsSettings({
            background: 'transparent',
            ...withBindings({})
        });
        expect(result.config).toEqual({ background: 'transparent' });
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toEqual([]);
    });

    it('does not mutate the config it is given', () => {
        const config = { background: 'transparent', ...withBindings({}) };
        const before = structuredClone(config);
        extractBindingsSettings(config);
        expect(config).toEqual(before);
    });

    it('reads every setting', () => {
        const bindings = {
            orient: 'right',
            float: true,
            collapsible: false,
            collapsed: true,
            maxSize: 0.6,
            fontFamily: 'Segoe UI',
            fontSize: 12,
            color: '#252423',
            accentColor: '#0078d4',
            background: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'transparent'
        };
        const result = extractBindingsSettings(
            withBindings(bindings),
            acceptAnyColor
        );
        expect(result.settings).toEqual({
            ...bindings,
            fontFamily: '"Segoe UI"'
        });
        expect(result.warnings).toEqual([]);
    });

    it('keeps the default for each setting that is not given', () => {
        const result = extractBindingsSettings(withBindings({ orient: 'top' }));
        expect(result.settings).toEqual({
            ...DEFAULT_BINDINGS_SETTINGS,
            orient: 'top'
        });
    });

    it.each([
        ['orient', 'middle'],
        ['orient', 3],
        ['float', 'yes'],
        ['collapsible', 1],
        ['collapsed', null],
        ['maxSize', 0],
        ['maxSize', -0.4],
        ['maxSize', 1.01],
        ['maxSize', 40],
        ['maxSize', Infinity],
        ['maxSize', NaN],
        ['maxSize', '0.4'],
        ['maxSize', true],
        ['fontFamily', ''],
        ['fontFamily', 12],
        ['fontSize', 0],
        ['fontSize', -1],
        ['fontSize', 0.5],
        ['fontSize', 101],
        ['fontSize', 1e308],
        ['fontSize', Infinity],
        ['fontSize', NaN],
        ['fontSize', '12'],
        ['color', 5]
    ])('falls back to the default and warns when %s is %j', (key, value) => {
        const result = extractBindingsSettings(
            withBindings({ [key]: value }),
            acceptAnyColor
        );
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain(`deneb.bindings.${key}`);
    });

    it.each(['color', 'accentColor', 'background', 'borderColor'])(
        'rejects a value for %s that is not a colour',
        (key) => {
            const result = extractBindingsSettings(
                withBindings({ [key]: 'banana' }),
                rejectAnyColor
            );
            expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain(`deneb.bindings.${key}`);
        }
    );

    it('lets the pane take two fifths of the visual unless the author says otherwise', () => {
        expect(DEFAULT_BINDINGS_SETTINGS.maxSize).toBe(0.4);
        expect(
            extractBindingsSettings(withBindings({ orient: 'left' })).settings
                .maxSize
        ).toBe(0.4);
    });

    it.each([0.05, 0.4, 0.75, 1])(
        'lets the pane take %j of the visual when the author says so',
        (maxSize) => {
            const result = extractBindingsSettings(withBindings({ maxSize }));
            expect(result.settings.maxSize).toBe(maxSize);
            expect(result.warnings).toEqual([]);
        }
    );

    it('says what share of the visual the pane may take when it refuses one', () => {
        const result = extractBindingsSettings(withBindings({ maxSize: 40 }));
        expect(result.warnings[0]).toContain(
            'a number greater than 0 and no more than 1'
        );
    });

    it.each([1, 13.5, 100])('accepts a font size of %j', (fontSize) => {
        const result = extractBindingsSettings(withBindings({ fontSize }));
        expect(result.settings.fontSize).toBe(fontSize);
        expect(result.warnings).toEqual([]);
    });

    it('says what a font size may be when it refuses one', () => {
        const result = extractBindingsSettings(withBindings({ fontSize: 500 }));
        expect(result.warnings[0]).toContain('a number from 1 to 100');
    });

    it.each([null, undefined, ['deneb'], 'deneb', 7])(
        'returns the defaults and the same value when the config is %j',
        (config) => {
            const result = extractBindingsSettings(
                config as unknown as Record<string, unknown>
            );
            expect(result.settings).toBe(DEFAULT_BINDINGS_SETTINGS);
            expect(result.config).toBe(config);
            expect(result.warnings).toEqual([]);
        }
    );

    it('ignores a key it does not recognise and warns about it', () => {
        const result = extractBindingsSettings({
            deneb: { theme: 'dark', bindings: { orientation: 'left' } }
        });
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toHaveLength(2);
        expect(result.warnings[0]).toContain('deneb.theme');
        expect(result.warnings[1]).toContain('deneb.bindings.orientation');
    });

    it('warns when deneb is not an object, and still removes it', () => {
        const result = extractBindingsSettings({ deneb: 'bindings' });
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.config).toEqual({});
        expect(result.warnings).toHaveLength(1);
    });

    it('warns when deneb.bindings is not an object', () => {
        const result = extractBindingsSettings(withBindings(['right']));
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toHaveLength(1);
    });

    it('accepts a colour of a plain shape where the platform cannot check it', () => {
        expect(
            extractBindingsSettings(withBindings({ color: 'unchecked' }))
                .settings.color
        ).toBe('unchecked');
        const blank = extractBindingsSettings(withBindings({ color: '  ' }));
        expect(blank.settings.color).toBeUndefined();
        expect(blank.warnings).toHaveLength(1);
    });

    it('uses the platform colour check when there is one', () => {
        vi.stubGlobal('CSS', {
            supports: (property: string, value: string) =>
                property === 'color' && value === 'red'
        });
        expect(
            extractBindingsSettings(withBindings({ color: 'red' })).settings
                .color
        ).toBe('red');
        expect(
            extractBindingsSettings(withBindings({ color: 'reddish' })).warnings
        ).toHaveLength(1);
    });

    describe('font family', () => {
        const fontFamilyOf = (fontFamily: unknown) =>
            extractBindingsSettings({ deneb: { bindings: { fontFamily } } });

        it('rebuilds the list of names with its own quotes and commas', () => {
            expect(fontFamilyOf('Segoe UI').settings.fontFamily).toBe(
                '"Segoe UI"'
            );
            expect(
                fontFamilyOf(`'Segoe UI', wf_standard-font ,sans-serif`)
                    .settings.fontFamily
            ).toBe('"Segoe UI", "wf_standard-font", sans-serif');
            expect(
                fontFamilyOf('"Yu Gothic UI", 游ゴシック').settings.fontFamily
            ).toBe('"Yu Gothic UI", "游ゴシック"');
        });

        it('leaves a hyphen-led keyword unquoted', () => {
            const list =
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            expect(fontFamilyOf(list).settings.fontFamily).toBe(list);
        });

        it('quotes a name with combining marks and one that is only hyphens', () => {
            expect(fontFamilyOf('मंगल').settings.fontFamily).toBe('"मंगल"');
            expect(fontFamilyOf('--x').settings.fontFamily).toBe('"--x"');
        });

        it.each([
            'inherit',
            'Initial',
            'unset',
            'revert',
            'revert-layer',
            'default'
        ])(
            'quotes the keyword %j, so that it names a font and nothing else',
            (keyword) => {
                expect(
                    fontFamilyOf(`Arial, ${keyword}`).settings.fontFamily
                ).toBe(`Arial, "${keyword}"`);
            }
        );

        it.each([
            'Arial; background: url(https://example.com/a.png)',
            'Arial} body { color: red',
            'url(https://example.com/a.woff)',
            'Arial, "unbalanced',
            'Arial/**/',
            'Arial\\',
            '<style>',
            'a:b',
            '',
            ' , ',
            'Arial,,serif'
        ])('refuses %j and leaves the theme font in place', (fontFamily) => {
            const { settings, warnings } = fontFamilyOf(fontFamily);
            expect(settings).not.toHaveProperty('fontFamily');
            expect(warnings).toHaveLength(1);
        });
    });

    describe('colours', () => {
        const colorOf = (color: unknown, isValidColor?: ColorValidator) =>
            extractBindingsSettings(
                { deneb: { bindings: { color } } },
                isValidColor
            );

        it.each([
            '#fff',
            '#AABBCCDD',
            'red',
            'transparent',
            'rgb(1, 2, 3)',
            'rgba(1,2,3,.5)',
            'hsl(120 50% 50% / 0.5)',
            'oklch(60% 0.15 50)',
            ' steelblue '
        ])('accepts %j and stores it trimmed', (color) => {
            expect(colorOf(color).settings.color).toBe(color.trim());
        });

        it.each([
            'var(--colorBrandBackground)',
            'var(--x, url(https://example.com/a.png))',
            'url(https://example.com/a.png)',
            'red; background: url(https://example.com/a.png)',
            'rgb(1, 2, 3)) } body { color: red',
            'rgb(var(--x), 2, 3)',
            'color-mix(in srgb, red, blue)',
            'env(safe-area-inset-top)',
            ''
        ])('refuses %j even when the platform accepts it', (color) => {
            const { settings, warnings } = colorOf(color, () => true);
            expect(settings).not.toHaveProperty('color');
            expect(warnings).toHaveLength(1);
        });

        it.each(['rgb(1,\n2,3)', 'rgb(1,\t2,3)'])(
            'refuses %j even when the platform accepts it',
            (color) => {
                const { settings, warnings } = colorOf(color, () => true);
                expect(settings).not.toHaveProperty('color');
                expect(warnings).toHaveLength(1);
            }
        );

        it.each([
            'inherit',
            'INITIAL',
            'unset',
            'revert',
            'currentcolor',
            'currentColor'
        ])(
            'refuses the keyword %j even when the platform accepts it',
            (color) => {
                const { settings, warnings } = colorOf(color, () => true);
                expect(settings).not.toHaveProperty('color');
                expect(warnings).toHaveLength(1);
            }
        );

        it('refuses a value of the right shape that the platform says is not a colour', () => {
            const { settings, warnings } = colorOf('banana', () => false);
            expect(settings).not.toHaveProperty('color');
            expect(warnings).toHaveLength(1);
        });
    });
});
