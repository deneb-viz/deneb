import powerbi from 'powerbi-visuals-api';
import { FormattingSettingsService } from 'powerbi-visuals-utils-formattingmodel';
import { VisualFormattingSettingsModel } from './visual-formatting-settings-model';

let formattingSettingsService: FormattingSettingsService =
    new FormattingSettingsService();

/**
 * Used to manage visual formatting settings.
 *
 * VISUAL FORMATTING SERVICES WILL NOT BE ACCESSIBLE UNLESS THIS IS BOUND.
 */
export const VisualFormattingSettingsService = {
    bind: (localizationManager: powerbi.extensibility.ILocalizationManager) => {
        formattingSettingsService = new FormattingSettingsService(
            localizationManager
        );
    }
};

/**
 * Process the supplied data view into a formatting model. This is a wrapper for the MS `populateFormattingSettingsModel()` method, using
 * the bound formatting settings service.
 */
export const getVisualFormattingModel = (
    dataView?: powerbi.DataView
): VisualFormattingSettingsModel => {
    return formattingSettingsService.populateFormattingSettingsModel(
        VisualFormattingSettingsModel,
        dataView || <powerbi.DataView>{}
    );
};

/**
 * Get the visual formatting service, with the current bound localization manager.
 */
export const getVisualFormattingService = () => formattingSettingsService;
