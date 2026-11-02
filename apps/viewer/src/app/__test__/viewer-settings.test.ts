import type powerbi from 'powerbi-visuals-api';
import { describe, expect, it } from 'vitest';
import { FormattingSettingsService } from 'powerbi-visuals-utils-formattingmodel';

import { getDenebState } from '@deneb-viz/app-core';
import { ViewerSettingsModel } from '../viewer-settings';
import { TEMPLATE_PROPERTIES } from '../template-card';

/** Minimal fake: the service only calls `getDisplayName` on it. */
const fakeLocalizationManager = {
    getDisplayName: (key: string) => key
} as unknown as powerbi.extensibility.ILocalizationManager;

const service = new FormattingSettingsService(fakeLocalizationManager);

/** Properties that hold the template or internal state, never exposed. */
const TEMPLATE_AND_INTERNAL = [
    'vega-jsonSpec',
    'vega-jsonConfig',
    'vega-provider',
    'vega-version',
    'vega-logLevel',
    'stateManagement-supportFieldConfiguration',
    'stateManagement-denebMetaVersion',
    'stateManagement-viewportHeight',
    'stateManagement-viewportWidth'
];

const populated = (objects: powerbi.DataViewObjects = {}) =>
    service.populateFormattingSettingsModel(ViewerSettingsModel, {
        metadata: { columns: [], objects }
    } as powerbi.DataView);

const build = (model: ViewerSettingsModel) =>
    service.buildFormattingModel(model);

/** Every slice uid in a built formatting model, as `object-property`. */
const sliceUids = (model: powerbi.visuals.FormattingModel): string[] =>
    model.cards.flatMap((card) =>
        card.groups.flatMap((group) =>
            ('slices' in group ? (group.slices ?? []) : []).map(
                (slice) => slice.uid
            )
        )
    );

const descriptorIds = (cards: powerbi.visuals.FormattingCard[]): string[] =>
    cards.flatMap((card) =>
        (card.revertToDefaultDescriptors ?? []).map(
            (descriptor) =>
                `${descriptor.objectName}-${descriptor.propertyName}`
        )
    );

const TEMPLATE_PROPERTY_IDS = TEMPLATE_PROPERTIES.map(
    (descriptor) => `${descriptor.objectName}-${descriptor.propertyName}`
);

const visibleSlices = (model: ViewerSettingsModel) => {
    const formatting = build(model);
    return new Set(sliceUids(formatting));
};

/** A built slice by uid, as `object-property`. */
const builtSlice = (
    model: powerbi.visuals.FormattingModel,
    uid: string
): powerbi.visuals.FormattingSlice | undefined =>
    model.cards
        .flatMap((card) =>
            card.groups.flatMap((group) =>
                'slices' in group ? (group.slices ?? []) : []
            )
        )
        .find((slice) => slice.uid === uid);

const cardByUid = (model: powerbi.visuals.FormattingModel, uid: string) =>
    model.cards.filter((card) => card.uid === uid);

describe('ViewerSettingsModel format pane', () => {
    it('shows exactly the template, interactivity, rendered visual and data limit cards', () => {
        expect(build(populated()).cards.map((card) => card.uid)).toEqual([
            'template-card',
            'vega-card',
            'display-card',
            'dataLimit-card'
        ]);
    });

    it("lays interactivity out in the settings pane's groups", () => {
        const [vegaCard] = cardByUid(build(populated()), 'vega-card');
        expect(vegaCard.groups.map((group) => group.uid)).toEqual([
            'tooltips-group',
            'contextMenu-group',
            'crossFiltering-group',
            'crossHighlighting-group'
        ]);
    });

    it('leads the rendered visual card with render mode and scale to zoom, stored on their own objects', () => {
        const [displayCard] = cardByUid(build(populated()), 'display-card');
        const [rendering] = displayCard.groups;
        expect(rendering.uid).toBe('rendering-group');
        expect(
            ('slices' in rendering ? (rendering.slices ?? []) : []).map(
                (slice) => slice.uid
            )
        ).toEqual(['vega-renderMode', 'stateManagement-scaleToZoom']);
    });

    it('resets render mode and scale to zoom with the rendered visual card, and nothing else outside it', () => {
        const descriptors = descriptorIds(
            cardByUid(build(populated()), 'display-card')
        );
        expect(descriptors).toContain('vega-renderMode');
        expect(descriptors).toContain('stateManagement-scaleToZoom');
        expect(descriptors.filter((id) => !id.startsWith('display-'))).toEqual([
            'vega-renderMode',
            'stateManagement-scaleToZoom'
        ]);
    });

    it('reads saved render mode and scale to zoom into the rendered visual card', () => {
        const model = populated({
            vega: { renderMode: 'canvas' },
            stateManagement: { scaleToZoom: true }
        });
        expect(model.display.rendering.renderMode.value).toBe('canvas');
        expect(model.display.rendering.scaleToZoom.value).toBe(true);
    });

    it('never exposes the template, logging or internal state', () => {
        const exposed = sliceUids(build(populated()));
        for (const id of TEMPLATE_AND_INTERNAL) {
            expect(exposed).not.toContain(id);
        }
    });

    it('keeps the template and internal state out of every other card reset', () => {
        const otherCards = build(populated()).cards.filter(
            (card) => card.uid !== 'template-card'
        );
        const descriptors = descriptorIds(otherCards);
        expect(descriptors.length).toBeGreaterThan(0);
        for (const id of TEMPLATE_AND_INTERNAL) {
            expect(descriptors).not.toContain(id);
        }
    });

    it('resets every template property, and only those, from the Template card', () => {
        const templateCard = build(populated()).cards.filter(
            (card) => card.uid === 'template-card'
        );
        expect(descriptorIds(templateCard).sort()).toEqual(
            [...TEMPLATE_PROPERTY_IDS].sort()
        );
        // Spelled out independently of TEMPLATE_PROPERTIES, so dropping a
        // template-held property from the card fails here.
        expect([...TEMPLATE_PROPERTY_IDS].sort()).toEqual(
            [
                'vega-jsonSpec',
                'vega-jsonConfig',
                'vega-provider',
                'vega-version',
                'stateManagement-supportFieldConfiguration',
                'stateManagement-denebMetaVersion',
                'stateManagement-consolidateFieldParameters'
            ].sort()
        );
    });

    it('shows whether a template is applied on the Template card', () => {
        const { translate } = getDenebState().i18n;
        const withTemplate = populated({
            vega: { jsonSpec: '{"mark": "bar"}' }
        });
        build(withTemplate);
        expect(withTemplate.viewerTemplate.status.value).toBe(
            translate('PowerBI_Viewer_Template_Applied')
        );
        const withoutTemplate = populated();
        build(withoutTemplate);
        expect(withoutTemplate.viewerTemplate.status.value).toBe(
            translate('PowerBI_Viewer_Template_None')
        );
    });

    it('keeps the host cards hidden, in developer mode too', () => {
        const model = populated();
        model.resolveDeveloperSettings(true);
        expect(model.vega.visible).toBe(false);
        expect(model.stateManagement.visible).toBe(false);
        expect(model.developer.visible).toBe(false);
    });

    it('reads the saved template into the hidden host vega card', () => {
        const spec = '{"mark": "bar"}';
        const model = populated({
            vega: { jsonSpec: spec, provider: 'vegaLite' }
        });
        expect(model.vega.output.jsonSpec.value).toBe(spec);
        expect(model.vega.output.provider.value).toBe('vegaLite');
    });

    it('reads saved interactivity into the visible card', () => {
        const model = populated({ vega: { enableTooltips: false } });
        expect(model.interactivity.interactivity.enableTooltips.value).toBe(
            false
        );
    });
});

describe('ViewerSettingsModel conditional slices', () => {
    const isDisabled = (objects: powerbi.DataViewObjects, uid: string) =>
        builtSlice(build(populated(objects)), uid)?.disabled === true;

    it('disables the tooltip delay, with a reason, while tooltips are off', () => {
        expect(
            isDisabled({ vega: { enableTooltips: true } }, 'vega-tooltipDelay')
        ).toBe(false);
        expect(
            isDisabled({ vega: { enableTooltips: false } }, 'vega-tooltipDelay')
        ).toBe(true);
        expect(
            builtSlice(
                build(populated({ vega: { enableTooltips: false } })),
                'vega-tooltipDelay'
            )?.disabledReason
        ).toBe('Objects_Vega_TooltipDelay_DisabledReason');
    });

    it('disables data point actions while the context menu is off', () => {
        const uid = 'vega-enableContextMenuSelector';
        expect(isDisabled({ vega: { enableContextMenu: true } }, uid)).toBe(
            false
        );
        expect(isDisabled({ vega: { enableContextMenu: false } }, uid)).toBe(
            true
        );
    });

    it('disables scale to report zoom unless the render mode is canvas', () => {
        const uid = 'stateManagement-scaleToZoom';
        expect(isDisabled({ vega: { renderMode: 'canvas' } }, uid)).toBe(false);
        expect(isDisabled({ vega: { renderMode: 'svg' } }, uid)).toBe(true);
    });

    it('hides the selection mode and limit while selection is disabled', () => {
        const slices = visibleSlices(
            populated({ vega: { enableSelection: false } })
        );
        expect(slices).not.toContain('vega-selectionMode');
        expect(slices).not.toContain('vega-selectionMaxDataPoints');
    });

    it('shows the selection limit only in simple selection mode', () => {
        expect(
            visibleSlices(
                populated({
                    vega: { enableSelection: true, selectionMode: 'simple' }
                })
            )
        ).toContain('vega-selectionMaxDataPoints');
        expect(
            visibleSlices(
                populated({
                    vega: { enableSelection: true, selectionMode: 'advanced' }
                })
            )
        ).not.toContain('vega-selectionMaxDataPoints');
    });

    it('offers the selection mode only for Vega templates', () => {
        expect(
            visibleSlices(
                populated({
                    vega: { enableSelection: true, provider: 'vega' }
                })
            )
        ).toContain('vega-selectionMode');
        expect(
            visibleSlices(
                populated({
                    vega: { enableSelection: true, provider: 'vegaLite' }
                })
            )
        ).not.toContain('vega-selectionMode');
    });
});
