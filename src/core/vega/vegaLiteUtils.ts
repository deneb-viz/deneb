// Apply specific patching operations to a supplied spec
export const getPatchedVegaLiteSpec = (spec: Object) => ({
    ...spec,
    ...getPatchedTopLevelDimensions(spec)
});

// Logic to patch height and/or width into a spec, if not supplied
const getPatchedTopLevelDimensions = (spec: Object) => ({
    height: spec['height'] || 'container',
    width: spec['width'] || 'container'
});
