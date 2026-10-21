import { describe, expect, it } from 'vitest';
import powerbi from 'powerbi-visuals-api';

import {
    closesRenderingSynchronously,
    hasDataFields,
    isReadMode,
    resolveSurface,
    type DisplayMode,
    type Surface
} from '../surface';

type Options = powerbi.extensibility.visual.VisualUpdateOptions;

const withColumns = (count: number) =>
    ({
        dataViews: [{ metadata: { columns: new Array(count).fill({}) } }]
    }) as unknown as Options;

describe('resolveSurface', () => {
    const cases: [DisplayMode, boolean, boolean, Surface][] = [
        // mode, read mode, fields assigned, surface
        ['initializing', false, false, 'splash'],
        ['initializing', true, true, 'splash'],
        ['fetching', false, true, 'fetching'],
        ['fetching', true, true, 'fetching'],
        ['no-project', false, true, 'create'],
        ['no-project', false, false, 'add-fields'],
        ['no-project', true, true, 'landing'],
        ['no-project', true, false, 'landing'],
        ['landing', false, false, 'add-fields'],
        ['landing', true, false, 'landing'],
        ['viewer', false, true, 'viewer'],
        ['viewer', true, true, 'viewer']
    ];

    it.each(cases)(
        'mode %s, read mode %s, fields %s -> %s',
        (mode, readMode, fieldsAssigned, expected) => {
            expect(resolveSurface(mode, readMode, fieldsAssigned)).toBe(
                expected
            );
        }
    );

    it('never offers the import surface to a reader', () => {
        const modes: DisplayMode[] = [
            'initializing',
            'fetching',
            'no-project',
            'landing',
            'viewer',
            'editor',
            'transition-viewer-editor',
            'transition-editor-viewer'
        ];
        for (const mode of modes) {
            for (const fieldsAssigned of [true, false]) {
                expect(resolveSurface(mode, true, fieldsAssigned)).not.toBe(
                    'create'
                );
            }
        }
    });

    it('falls back to the landing state for combinations the kernel does not report', () => {
        expect(resolveSurface('viewer', false, false)).toBe('landing');
        expect(resolveSurface('editor', false, true)).toBe('landing');
        expect(resolveSurface('transition-viewer-editor', false, true)).toBe(
            'landing'
        );
    });
});

describe('isReadMode', () => {
    it('is true only for the View mode', () => {
        expect(isReadMode({ viewMode: 0 } as Options)).toBe(true);
        expect(isReadMode({ viewMode: 1 } as Options)).toBe(false);
        expect(isReadMode({ viewMode: 2 } as Options)).toBe(false);
    });

    it('is false before the first update', () => {
        expect(isReadMode(undefined)).toBe(false);
    });
});

describe('hasDataFields', () => {
    it('is true when the data view carries at least one column', () => {
        expect(hasDataFields(withColumns(1))).toBe(true);
        expect(hasDataFields(withColumns(3))).toBe(true);
    });

    it('is false for no columns, no data view, or no update yet', () => {
        expect(hasDataFields(withColumns(0))).toBe(false);
        expect(hasDataFields({ dataViews: [] } as unknown as Options)).toBe(
            false
        );
        expect(hasDataFields(undefined)).toBe(false);
    });
});

describe('closesRenderingSynchronously', () => {
    it('defers only the viewer, whose Vega callbacks close the lifecycle', () => {
        expect(closesRenderingSynchronously('viewer')).toBe(false);
    });

    it.each<Surface>(['splash', 'fetching', 'create', 'add-fields', 'landing'])(
        '%s closes the lifecycle as soon as it is shown',
        (surface) => {
            expect(closesRenderingSynchronously(surface)).toBe(true);
        }
    );
});
