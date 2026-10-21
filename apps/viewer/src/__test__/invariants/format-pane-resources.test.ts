import { describe, it, expect } from 'vitest';
import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import { ViewerSettingsModel } from '../../app/viewer-settings';
import { readAppJson } from './_files';

/**
 * Canary: every format-pane card this visual builds is declared in its
 * capabilities, and every string key the cards use resolves in its en-US
 * resources. Missing either fails only in Power BI, at runtime.
 */
type Capabilities = {
    objects: Record<string, { properties: Record<string, unknown> }>;
};
const capabilities = readAppJson<Capabilities>('capabilities.json');
const resources = readAppJson<Record<string, string>>(
    'stringResources/en-US/resources.resjson'
);

type Keyed = {
    name?: string;
    displayNameKey?: string;
    descriptionKey?: string;
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
        'card %s is a capabilities object, with every slice a property of it',
        (name, card) => {
            const object = capabilities.objects[name];
            expect(object).toBeDefined();
            for (const slice of slicesOf(card)) {
                expect(object.properties).toHaveProperty(slice.name as string);
            }
        }
    );
});

describe('format pane strings resolve', () => {
    const keys = model.cards.flatMap((card) => {
        const groups =
            card instanceof formattingSettings.CompositeCard ? card.groups : [];
        return [card as Keyed, ...(groups as Keyed[]), ...slicesOf(card)]
            .flatMap((item) => [item.displayNameKey, item.descriptionKey])
            .filter((key): key is string => typeof key === 'string');
    });

    it('collects a non-trivial key set (guards against a vacuous canary)', () => {
        expect(keys.length).toBeGreaterThan(20);
    });

    it('every display name and description key exists in the en-US resources', () => {
        expect(keys.filter((key) => !(key in resources))).toEqual([]);
    });
});
