import { describe, expect, it } from 'vitest';

import { VisualFormattingSettingsModel } from '../visual-settings';

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
