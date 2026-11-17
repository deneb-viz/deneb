import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    DEFAULT_BINDINGS_SETTINGS,
    extractBindingsSettings
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
        expect(result.settings).toEqual(bindings);
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
        ['fontFamily', ''],
        ['fontFamily', 12],
        ['fontSize', 0],
        ['fontSize', -1],
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
                withBindings({ [key]: 'not-a-colour' }),
                rejectAnyColor
            );
            expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain(`deneb.bindings.${key}`);
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

    it('accepts any non-empty text as a colour where the platform cannot check it', () => {
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
});
