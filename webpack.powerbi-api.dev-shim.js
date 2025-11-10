// Provides runtime enum-like objects for dev mode.
// These are added manually to work around limitations with webpack externals and source maps against the powerbi-visuals-api package.
// It's not ideal and we should aim to remove this in future, but it works for now.
// For now, only add the enums that are actually used at runtime by Deneb.
module.exports = {
    visuals: {},
    extensibility: { visual: {} },
    VisualDataChangeOperationKind: {
        Create: 0,
        Append: 1,
        Segment: 2
    },
    VisualUpdateType: {
        Data: 2,
        Resize: 4,
        ViewMode: 8,
        Style: 16,
        ResizeEnd: 32,
        FormattingSubSelectionChange: 64,
        FormatModeChange: 128,
        FilterOptionsChange: 256,
        All: 510
    },
    ViewMode: {
        View: 0,
        Edit: 1,
        InFocusEdit: 2
    },
    EditMode: {
        Default: 0,
        Advanced: 1
    }
};
