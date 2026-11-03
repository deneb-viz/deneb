import { describe, it, expect } from 'vitest';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { ViewerSettingsModel } from '../../app/viewer-settings';
import { readAppJson } from './_files';

/**
 * Canary: every format-pane card this visual builds is declared in its
 * capabilities, and every string key the cards and capabilities use
 * resolves in its en-US resources. Missing either fails only in Power BI,
 * at runtime.
 */
type Capabilities = {
    objects: Record<string, { properties: Record<string, unknown> }>;
};
const capabilities = readAppJson<Capabilities>('capabilities.json');

// Power BI receives the strings shared by every visual (in powerbi-host)
// with this app's own resources merged over them; see
// webpack.common.config.js.
const sharedResources = readAppJson<{ values: Record<string, string> }>(
    '../../packages/powerbi-host/stringResources/en-US.json'
).values;
const appResources = readAppJson<Record<string, string>>(
    'stringResources/en-US/resources.resjson'
);
const resources = { ...sharedResources, ...appResources };

/** Every `displayNameKey` and `descriptionKey` value in a capabilities tree. */
const capabilityKeys = (node: unknown): string[] => {
    if (Array.isArray(node)) return node.flatMap(capabilityKeys);
    if (node === null || typeof node !== 'object') return [];
    return Object.entries(node).flatMap(([key, value]) =>
        (key === 'displayNameKey' || key === 'descriptionKey') &&
        typeof value === 'string'
            ? [value]
            : capabilityKeys(value)
    );
};

type Keyed = {
    name?: string;
    /** Set on a slice stored on another object than its card's. */
    objectName?: string;
    displayNameKey?: string;
    descriptionKey?: string;
    disabledReasonKey?: string;
};

const slicesOf = (card: formattingSettings.Cards): Keyed[] => {
    const groups =
        card instanceof formattingSettings.CompositeCard
            ? card.groups
            : [card as formattingSettings.SimpleCard];
    return groups.flatMap((group) => (group.slices ?? []) as Keyed[]);
};

const model = new ViewerSettingsModel();

describe('format pane cards match capabilities', () => {
    it.each(model.cards.map((card) => [card.name, card] as const))(
        'card %s is a capabilities object, with every slice a property of the object it is stored on',
        (name, card) => {
            expect(capabilities.objects[name]).toBeDefined();
            for (const slice of slicesOf(card)) {
                const object = capabilities.objects[slice.objectName ?? name];
                expect(object).toBeDefined();
                expect(object.properties).toHaveProperty(slice.name as string);
            }
        }
    );

    it('stores the rendered visual card’s rendering settings on their own objects', () => {
        const rendering = slicesOf(model.display).filter(
            (slice) => slice.objectName !== undefined
        );
        expect(
            rendering.map((slice) => `${slice.objectName}.${slice.name}`)
        ).toEqual(['vega.renderMode', 'stateManagement.scaleToZoom']);
    });
});

describe('format pane strings resolve', () => {
    const cardKeys = model.cards.flatMap((card) => {
        const groups =
            card instanceof formattingSettings.CompositeCard ? card.groups : [];
        return [card as Keyed, ...(groups as Keyed[]), ...slicesOf(card)]
            .flatMap((item) => [
                item.displayNameKey,
                item.descriptionKey,
                item.disabledReasonKey
            ])
            .filter((key): key is string => typeof key === 'string');
    });
    const keys = [...cardKeys, ...capabilityKeys(capabilities)];

    it('collects a non-trivial key set (guards against a vacuous canary)', () => {
        expect(cardKeys.length).toBeGreaterThan(20);
    });

    it('every display name and description key exists in the en-US resources', () => {
        expect(keys.filter((key) => !(key in resources))).toEqual([]);
    });

    it('keeps app strings out of the shared keys, so neither silently overrides the other', () => {
        expect(
            Object.keys(appResources).filter((key) => key in sharedResources)
        ).toEqual([]);
    });

    // Dead strings would still be sent for translation. The shared strings
    // are checked against every card by the full edition's canary.
    it("holds only app strings this visual's cards or capabilities use", () => {
        const used = new Set(keys);
        expect(
            Object.keys(appResources).filter((key) => !used.has(key))
        ).toEqual([]);
    });
});
