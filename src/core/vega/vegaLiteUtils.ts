export { getPatchedVegaLiteSpec, vegaLiteUtils };

// Apply specific patching operations to a supplied spec
const getPatchedVegaLiteSpec = (spec: Object) => ({
    ...spec,
    ...getPatchedTopLevelDimensions(spec)
});

// Logic to patch height and/or width into a spec, if not supplied
const getPatchedTopLevelDimensions = (spec: Object) => ({
    height: spec['height'] || 'container',
    width: spec['width'] || 'container'
});

// Avoids linting issues (can't seem to disable w/eslint-disable). Can be removed if/when we extend Vega-Lite API
const vegaLiteUtils = null;
