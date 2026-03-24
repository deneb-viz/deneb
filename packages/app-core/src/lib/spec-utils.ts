/**
 * Remove the `$schema` property from a spec object.
 *
 * When a spec is loaded into the Monaco editor, Deneb uses its own schema resolution via the built-in language service. We also apply some
 * overrides for the `pbi*` customizations we make. Therefore an external `$schema` URL would cause Monaco to attempt a network fetch that
 * will fail inside places where we can't do external calls (like Power BI), or we may not detect custom additions correctly. Stripping it
 * avoids both the failed fetch and any conflict with the internal schema.
 */
export const stripSchemaFromSpec = (
    spec: Record<string, unknown>
): Record<string, unknown> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema, ...rest } = spec;
    return rest;
};

/**
 * Remove the `config` property from a spec object.
 *
 * When converting from Vega-Lite to Vega, the VL compiler embeds config into the compiled
 * Vega spec. Deneb manages config separately (in the config editor), so we strip it from
 * the spec to avoid double-application.
 */
export const stripConfigFromSpec = (
    spec: Record<string, unknown>
): Record<string, unknown> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { config, ...rest } = spec;
    return rest;
};
