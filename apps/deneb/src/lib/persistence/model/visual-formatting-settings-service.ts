import powerbi from 'powerbi-visuals-api';
import { FormattingSettingsService } from 'powerbi-visuals-utils-formattingmodel';
import { HostSettingsModel } from './host-settings-model';

let formattingSettingsService: FormattingSettingsService =
    new FormattingSettingsService();

/**
 * The model class `populateFormattingSettingsModel` instantiates.
 * Defaults to the base `HostSettingsModel` until an app binds its own
 * class via `VisualFormattingSettingsService.bind`; this module never
 * imports an app's model class directly.
 */
let boundModelClass: new () => HostSettingsModel = HostSettingsModel;

/**
 * Used to manage visual formatting settings.
 *
 * VISUAL FORMATTING SERVICES WILL NOT BE ACCESSIBLE UNLESS THIS IS BOUND.
 */
export const VisualFormattingSettingsService = {
    bind: (
        localizationManager: powerbi.extensibility.ILocalizationManager,
        modelClass: new () => HostSettingsModel
    ) => {
        formattingSettingsService = new FormattingSettingsService(
            localizationManager
        );
        boundModelClass = modelClass;
    }
};

/**
 * Process the supplied data view into a formatting model. This is a wrapper for the MS `populateFormattingSettingsModel()` method, using
 * the bound formatting settings service and the model class bound via `VisualFormattingSettingsService.bind`.
 */
export const getVisualFormattingModel = (
    dataView?: powerbi.DataView
): HostSettingsModel => {
    return formattingSettingsService.populateFormattingSettingsModel(
        boundModelClass,
        dataView || <powerbi.DataView>{}
    );
};

/**
 * Get the visual formatting service, with the current bound localization manager.
 */
export const getVisualFormattingService = () => formattingSettingsService;
