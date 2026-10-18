/**
 * Kernel-side `en-US` strings: consumed only by `lib/**`, `state/**`,
 * `kernel/**` and the kernel-side status/overlay components. Authored as a
 * TypeScript module rather than JSON — no tsc-built package in the repo
 * imports JSON, so whether tsc copies a JSON asset into `dist` for webpack
 * to resolve is unproven, and a TypeScript module has no such question.
 */
export const en_US = {
    PowerBI_Text_Warning_Invalid_Cross_Filter_General_Error:
        '[pbiCrossFilterApply] {0}',
    PowerBI_Text_Warning_Invalid_Cross_Filter_Event_Type:
        'The first parameter must be a valid `event` from the Vega view.',
    PowerBI_Text_Warning_Invalid_Cross_Filter_Missing_Filter:
        'The second parameter must be a valid filter expression.',
    PowerBI_Text_Warning_Invalid_Cross_Filter_Incorrect_Mode:
        '[pbiCrossFilter] expression functions are valid only for Advanced cross-filtering management mode. Please refer to the documentation for more information.',
    PowerBI_Text_Warning_Invalid_Cross_Filter_Incorrect_Options:
        '`options` must be a valid object, and contain valid property values. Refer to the documentation for more information.',
    PowerBI_Text_Warning_Invalid_Cross_Filter_Not_Applied:
        '[pbiCrossFilterApply] We were not able to cross-filter data based on your supplied parameters.',
    PowerBI_Fetching_Data_Assistive_01_Prefix:
        "You're seeing this section because you've enabled the ",
    PowerBI_Fetching_Data_Assistive_01_Suffix:
        " property. There are some important things to note if you're intending to use this in your reports. The following events will trigger a reload, which may affect performance and make editing more cumbersome:",
    PowerBI_Fetching_Data_Assistive_02_Point_01:
        'Adding/removing columns & measures, and slicing data into the visual.',
    PowerBI_Fetching_Data_Assistive_02_Point_02:
        'Changing properties in the pane.',
    PowerBI_Fetching_Data_Assistive_02_Suffix:
        "As such, you may wish to disable this property if you're doing a lot of editing and then re-enable when ready to test and publish.",
    PowerBI_Fetching_Data_Assistive_03_Prefix:
        'You can prevent this message being displayed for your end-users by turning off the ',
    PowerBI_Fetching_Data_Assistive_03_Suffix: ' property.',
    PowerBI_Fetching_Data_Developer_Notes: 'Notes for Creators',
    PowerBI_Fetching_Data_Progress_Message: 'Fetching Data...',
    PowerBI_Fetching_Data_Progress_Suffix:
        'row(s) loaded from data model so far...',
    PowerBI_Objects_DataLimit_Override: 'Override row limit',
    PowerBI_Objects_DataLimit_ShowCustomVisualNotes: 'Show data loading notes',
    Text_Error_Dataset_Mapping_Failed:
        "Your data could not be processed into the visual's dataset, so the visual is showing an empty dataset to keep its output consistent. Please check your visual's fields and any recent changes to them, then try again.",
    Text_Warn_Persisted_Property_Unreadable:
        'A persisted visual property ({0}) could not be read and has been ignored. Default behavior applies for this property, and any previous customizations to it may need to be re-applied.'
};
