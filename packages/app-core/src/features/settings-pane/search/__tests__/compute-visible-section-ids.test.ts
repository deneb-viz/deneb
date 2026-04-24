import { describe, expect, it } from 'vitest';

import { computeVisibleSectionIds } from '../compute-visible-section-ids';

describe('computeVisibleSectionIds', () => {
    describe('empty query', () => {
        it('returns all core sections when no platform is present', () => {
            const result = computeVisibleSectionIds({
                query: '',
                matchedSections: new Set<string>(),
                platformSectionIds: [],
                registeredPlatformIds: []
            });
            expect(result).toEqual(['general', 'performance', 'dataset']);
        });

        it('includes every mounted platform section after core sections', () => {
            const result = computeVisibleSectionIds({
                query: '   ',
                matchedSections: new Set<string>(),
                platformSectionIds: ['tooltips', 'contextmenu', 'crossfilter'],
                registeredPlatformIds: [
                    'tooltips',
                    'contextmenu',
                    'crossfilter'
                ]
            });
            expect(result).toEqual([
                'general',
                'performance',
                'dataset',
                'tooltips',
                'contextmenu',
                'crossfilter'
            ]);
        });

        it('includes mounted platform sections even when unregistered', () => {
            const result = computeVisibleSectionIds({
                query: '',
                matchedSections: new Set<string>(),
                platformSectionIds: ['legacy-platform'],
                registeredPlatformIds: []
            });
            expect(result).toEqual([
                'general',
                'performance',
                'dataset',
                'legacy-platform'
            ]);
        });
    });

    describe('non-empty query', () => {
        it('returns only matched core sections in render order', () => {
            const result = computeVisibleSectionIds({
                query: 'provider',
                matchedSections: new Set(['performance', 'general']),
                platformSectionIds: [],
                registeredPlatformIds: []
            });
            expect(result).toEqual(['general', 'performance']);
        });

        it('includes all three matched flat sections in render order', () => {
            const result = computeVisibleSectionIds({
                query: 'x',
                matchedSections: new Set(['dataset', 'general', 'performance']),
                platformSectionIds: [],
                registeredPlatformIds: []
            });
            expect(result).toEqual(['general', 'performance', 'dataset']);
        });

        it('includes two flat + one platform match', () => {
            const result = computeVisibleSectionIds({
                query: 'tooltip',
                matchedSections: new Set([
                    'general',
                    'performance',
                    'tooltips'
                ]),
                platformSectionIds: ['tooltips', 'contextmenu'],
                registeredPlatformIds: ['tooltips', 'contextmenu']
            });
            expect(result).toEqual(['general', 'performance', 'tooltips']);
        });

        it('includes unregistered platform sections as always-visible', () => {
            const result = computeVisibleSectionIds({
                query: 'nothing-matches',
                matchedSections: new Set<string>(),
                platformSectionIds: ['legacy-a', 'legacy-b'],
                registeredPlatformIds: []
            });
            expect(result).toEqual(['legacy-a', 'legacy-b']);
        });

        it('keeps unregistered platforms visible when one registered platform matches', () => {
            const result = computeVisibleSectionIds({
                query: 'x',
                matchedSections: new Set(['tooltips']),
                platformSectionIds: ['tooltips', 'legacy-a', 'legacy-b'],
                registeredPlatformIds: ['tooltips']
            });
            expect(result).toEqual(['tooltips', 'legacy-a', 'legacy-b']);
        });

        it('matched + always-visible platform ids are deduplicated', () => {
            const result = computeVisibleSectionIds({
                query: 'x',
                matchedSections: new Set(['general', 'legacy-a']),
                platformSectionIds: ['legacy-a'],
                registeredPlatformIds: []
            });
            expect(result).toEqual(['general', 'legacy-a']);
        });

        it('renders matched platform sections in platformSectionIds order', () => {
            const result = computeVisibleSectionIds({
                query: 'x',
                matchedSections: new Set([
                    'crossfilter',
                    'tooltips',
                    'contextmenu'
                ]),
                platformSectionIds: ['tooltips', 'contextmenu', 'crossfilter'],
                registeredPlatformIds: [
                    'tooltips',
                    'contextmenu',
                    'crossfilter'
                ]
            });
            expect(result).toEqual(['tooltips', 'contextmenu', 'crossfilter']);
        });

        it('returns empty list when nothing matches and platform is hidden', () => {
            const result = computeVisibleSectionIds({
                query: 'nope',
                matchedSections: new Set<string>(),
                platformSectionIds: [],
                registeredPlatformIds: []
            });
            expect(result).toEqual([]);
        });
    });
});
