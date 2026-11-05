// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
    resolveLandingSteps,
    type LandingSteps,
    type LandingSurface
} from '../landing-steps';

describe('resolveLandingSteps', () => {
    const cases: [LandingSurface, boolean, boolean, LandingSteps][] = [
        // surface, read mode, template saved, steps
        [
            'add-fields',
            false,
            false,
            {
                addData: 'current',
                importTemplate: 'upcoming',
                addDataBody: 'default',
                showImport: false
            }
        ],
        [
            'add-fields',
            false,
            true,
            {
                addData: 'current',
                importTemplate: 'done',
                addDataBody: 'template-saved',
                showImport: false
            }
        ],
        [
            'create',
            false,
            false,
            {
                addData: 'done',
                importTemplate: 'current',
                addDataBody: 'default',
                showImport: true
            }
        ],
        ['landing', true, false, { addDataBody: 'default', showImport: false }],
        ['landing', true, true, { addDataBody: 'default', showImport: false }]
    ];

    it.each(cases)(
        'surface %s, read mode %s, template saved %s',
        (surface, readMode, hasTemplate, expected) => {
            expect(
                resolveLandingSteps({ surface, readMode, hasTemplate })
            ).toEqual(expected);
        }
    );

    it.each([false, true])(
        'gives an author on the landing fallback the add-fields steps (template saved %s)',
        (hasTemplate) => {
            expect(
                resolveLandingSteps({
                    surface: 'landing',
                    readMode: false,
                    hasTemplate
                })
            ).toEqual(
                resolveLandingSteps({
                    surface: 'add-fields',
                    readMode: false,
                    hasTemplate
                })
            );
        }
    );

    it.each(['add-fields', 'create', 'landing'] as LandingSurface[])(
        'never offers the import to a reader (surface %s)',
        (surface) => {
            expect(
                resolveLandingSteps({
                    surface,
                    readMode: true,
                    hasTemplate: false
                }).showImport
            ).toBe(false);
        }
    );
});
