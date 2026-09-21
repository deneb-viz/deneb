import type powerbi from 'powerbi-visuals-api';
import { describe, expect, it } from 'vitest';

// Imported from their leaf modules, not the `lib/persistence` barrel: that
// barrel also re-exports `persist.ts`/`migration.ts`, which import
// `../../state` — and `state/settings.ts` imports back from the barrel to
// seed the settings slice. Importing the barrel here would flip which side
// of that circular pair evaluates first and hit the classic ESM
// live-binding trap (`getVisualFormattingModel` still unbound when
// `state/settings.ts` runs). These two leaf modules have no such cycle.
import {
    VisualFormattingSettingsService,
    getVisualFormattingModel
} from '../../lib/persistence/model/visual-formatting-settings-service';
import { HostSettingsModel } from '../../lib/persistence/model/host-settings-model';
import {
    VisualFormattingSettingsModel,
    getVisualSettings
} from '../visual-settings';

/**
 * Minimal fake sufficient for `FormattingSettingsService`: it only calls
 * `getDisplayName` on the bound localization manager, and only for slices
 * that declare a `*Key` property.
 */
const fakeLocalizationManager = {
    getDisplayName: (key: string) => key
} as unknown as powerbi.extensibility.ILocalizationManager;

/**
 * Characterisation of the visual's composed formatting-pane model: the
 * editor card leads, followed by the generic host cards in the base
 * model's order, and developer-mode visibility is inherited unchanged.
 */
describe('VisualFormattingSettingsModel (composed by the visual)', () => {
    it('yields the card order: editor, display, dataLimit, stateManagement, vega, developer', () => {
        const model = new VisualFormattingSettingsModel();
        expect(model.cards.map((card) => card.name)).toEqual([
            'editor',
            'display',
            'dataLimit',
            'stateManagement',
            'vega',
            'developer'
        ]);
    });

    it('hides the developer, vega and state-management cards outside developer mode', () => {
        const model = new VisualFormattingSettingsModel();
        model.resolveDeveloperSettings(false);
        expect(model.developer.visible).toBe(false);
        expect(model.vega.visible).toBe(false);
        expect(model.stateManagement.visible).toBe(false);
        expect(model.editor.visible).not.toBe(false);
    });

    it('leaves every card visible in developer mode', () => {
        const model = new VisualFormattingSettingsModel();
        model.resolveDeveloperSettings(true);
        expect(model.developer.visible).not.toBe(false);
        expect(model.vega.visible).not.toBe(false);
        expect(model.stateManagement.visible).not.toBe(false);
    });
});

describe('getVisualFormattingModel after binding VisualFormattingSettingsModel', () => {
    it('returns an instance whose first card is the editor card, matching what the kernel re-seeds the store with', () => {
        VisualFormattingSettingsService.bind(
            fakeLocalizationManager,
            VisualFormattingSettingsModel
        );

        const model = getVisualFormattingModel();

        expect(model.cards[0].name).toBe('editor');
    });
});

describe('getVisualSettings', () => {
    it('throws when the bound model lacks the editor card (a bare HostSettingsModel)', () => {
        const bareSettings = new HostSettingsModel();

        expect(() => getVisualSettings(bareSettings)).toThrow();
    });

    it('returns the settings unchanged when the editor card is present', () => {
        const settings = new VisualFormattingSettingsModel();

        expect(getVisualSettings(settings)).toBe(settings);
    });
});
