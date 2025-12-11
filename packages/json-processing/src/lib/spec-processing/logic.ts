import { parse, type Spec } from 'vega';
import { compile, normalize, type TopLevelSpec } from 'vega-lite';
import { deepEqual } from 'fast-equals';

import { logDebug, logTimeEnd, logTimeStart } from '@deneb-viz/utils/logging';
import {
    ContentPatchResult,
    SpecificationComparisonOptions,
    type CompiledSpecification,
    type CompileStatus,
    type SpecificationParseOptions
} from './types';
import { mergician } from 'mergician';
import {
    getFriendlyValidationErrors,
    getProviderValidator
} from '../../validation';
import { getParsedJsonWithResult } from '../../processing';
import { omit } from '@deneb-viz/utils/object';
import {
    DATASET_DEFAULT_NAME,
    DatasetValueRow
} from '@deneb-viz/powerbi-compat/dataset';
import { getSignalPbiContainer } from '@deneb-viz/powerbi-compat/signals';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { LocalVegaLoggerService } from '@deneb-viz/vega-runtime/extensibility';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Borrowed from vega-editor
 */
const getErrorLine = (code: string, error: string) => {
    const pattern = /(position\s)(\d+)/;
    let charPos: any = error.match(pattern);

    if (charPos !== null) {
        charPos = charPos[2];
        if (!isNaN(charPos)) {
            let line = 1;
            let cursorPos = 0;

            while (
                cursorPos < charPos &&
                code.indexOf('\n', cursorPos) < charPos &&
                code.indexOf('\n', cursorPos) > -1
            ) {
                const newlinePos = code.indexOf('\n', cursorPos);
                line = line + 1;
                cursorPos = newlinePos + 1;
            }

            return `${error} and line ${line}`;
        }
    } else {
        return error;
    }
};

/**
 * Handle parsing of the JSON from the spec editor.
 */
export const getParsedSpec = (
    currentSpec: CompiledSpecification,
    prevOptions: SpecificationParseOptions,
    nextOptions: SpecificationParseOptions
): CompiledSpecification => {
    logTimeStart('getParsedSpec');
    logDebug('getParsedSpec starting', {
        currentSpec,
        prevOptions,
        nextOptions
    });
    const isVolatile = isSpecificationVolatile(prevOptions, nextOptions);
    if (!isVolatile) {
        logDebug('prev and next values match. No need to re-parse.');
        logTimeEnd('getParsedSpec');
        return currentSpec;
    }
    logDebug('prev and next values differ. Re-parsing...');
    const { config, logLevel, provider, spec } = nextOptions;
    const logger = new LocalVegaLoggerService();
    logger.level(logLevel);
    const patchedSpec = getPatchedSpec(spec, provider);
    const patchedConfig = getPatchedConfig(config);
    const warns: string[] = [];
    const errors: string[] = [];
    let status: CompileStatus = 'new';
    const specHasErrors = patchedSpec.errors.length > 0;
    const configHasErrors = patchedConfig.errors.length > 0;
    if (specHasErrors) {
        errors.push(getI18nValue('Text_Debug_Error_Spec_Parse'));
        errors.push(...patchedSpec.errors);
    }
    if (configHasErrors) {
        errors.push(getI18nValue('Text_Debug_Error_Config_Parse'));
        errors.push(...patchedConfig.errors);
    }
    let specToParse: Spec | TopLevelSpec | null = null;
    if (!specHasErrors && !configHasErrors) {
        logDebug('Spec and config are valid. Attempting to parse...', {
            patchedSpec,
            patchedConfig
        });
        specToParse = patchedSpec
            ? mergician(
                  { config: patchedConfig.result ?? {} },
                  patchedSpec.result ?? {}
              )
            : null;
        logDebug('Spec size: ', JSON.stringify(specToParse).length);
        try {
            if (nextOptions.validateSchema) {
                logTimeStart('schema validation');
                const validator = getProviderValidator({ provider });
                const valid = validator(specToParse);
                logTimeEnd('schema validation');
                if (!valid && validator.errors) {
                    getFriendlyValidationErrors(validator.errors).forEach(
                        (error) => logger.warn(`Validation: ${error}`)
                    );
                }
            }
            logTimeStart('vega/vega-lite compile');
            if (provider === 'vegaLite') {
                compile(<TopLevelSpec>specToParse);
            } else {
                parse(<Spec>specToParse);
            }
            logTimeEnd('vega/vega-lite compile');
            status = 'valid';
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            errors.push(getErrorLine(spec, getRedactedError(message)) ?? '');
            status = 'error';
            specToParse = null;
        }
        warns.push(...logger.warns);
    }
    // TODO: hashing should be replaced with something better when we refactor properly
    const hashValue = JSON.stringify(specToParse);
    logDebug('getParsedSpec results', {
        config,
        patchedConfig,
        spec,
        patchedSpec,
        specToParse,
        status,
        warns
    });
    const specification = {
        errors,
        hashValue,
        spec: specToParse,
        status,
        warns
    };
    logTimeEnd('getParsedSpec');
    return specification;
};

/**
 * Apply the base config for Power BI and then patch the editor config on top.
 */
const getPatchedConfig = (content: string): ContentPatchResult => {
    try {
        const parsedConfig = getParsedJsonWithResult(content);
        if (parsedConfig.errors.length > 0) return parsedConfig;
        const patched = {
            result: mergician(
                {
                    background: 'transparent', // defer to Power BI background, if applied
                    customFormatTypes: true
                },
                parsedConfig.result ?? {}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any,
            errors: []
        };
        // (#514, #525): we've seen issues with Vega-Lite where some folks are setting container width/height/autosize
        // in the config and because we're patching the spec, it gets into a bit of a mess. To avoid confusion, we'll
        // remove any such assignments here and the spec patching will handle them as they do currently. We'll do this
        // better when we re-visit the patching in future.
        if (patched.result['width'] === 'container') {
            delete patched.result['width'];
        }
        if (patched.result['height'] === 'container') {
            delete patched.result['height'];
        }
        if (patched.result['autosize']?.resize === true) {
            patched.result['autosize'].resize = false;
        }
        return patched;
    } catch (e) {
        return {
            result: null,
            errors: [e instanceof Error ? e.message : String(e)]
        };
    }
};

/**
 * Patch the data array in a spec to ensure that values from the visual dataset are in the correct place.
 */
const getPatchedData = (spec: Spec, values: DatasetValueRow[]) => {
    const name = DATASET_DEFAULT_NAME;
    logDebug('getPatchedData', { spec, values });
    try {
        const newSpec = spec ?? {};
        const data = newSpec?.data ?? [];
        const index = data.findIndex((ds) => ds.name == name);
        const patchedData =
            index >= 0 && newSpec.data
                ? [
                      ...newSpec.data.slice(0, index),
                      ...[
                          {
                              ...newSpec.data[index],
                              values
                          }
                      ],
                      ...newSpec.data.slice(index + 1)
                  ]
                : [
                      ...(newSpec.data ?? []),
                      ...[
                          {
                              name,
                              values
                          }
                      ]
                  ];
        return patchedData;
    } catch {
        return [{ name, values }];
    }
};

/**
 * For the spec and dataset values, attempt to parse the JSON and apply any
 * patches that we need to ensure that the visual functions as expected.
 */
const getPatchedSpec = (
    content: string,
    provider: SpecProvider
): ContentPatchResult => {
    try {
        const parsedSpec = getParsedJsonWithResult(content);
        if (parsedSpec.errors.length > 0) return parsedSpec;
        return {
            result:
                provider === 'vegaLite'
                    ? getPatchedVegaLiteSpec(<TopLevelSpec>parsedSpec.result)
                    : getPatchedVegaSpec(<Spec>parsedSpec.result),
            errors: []
        };
    } catch (e) {
        return {
            result: null,
            errors: [e instanceof Error ? e.message : String(e)]
        };
    }
};

/**
 * Apply specific patching operations to a supplied spec. This applies any
 * specific signals that we don't necessarily want the creator to worry about,
 * but will ensure that the visual functions as expected.
 */
const getPatchedVegaSpec = (spec: Spec): Spec => {
    return mergician(spec, {
        height: spec['height'] ?? { signal: 'pbiContainerHeight' },
        width: spec['width'] ?? { signal: 'pbiContainerWidth' },
        signals: [
            ...(spec['signals'] || []),
            ...(PROVIDER_RESOURCE_CONFIGURATION?.vega?.patch?.signals || []),
            getSignalPbiContainer()
        ]
    });
};

/**
 * Merge the Vega spec and dataset values together.
 * @privateRemarks We've found some issues with react-vega, where if we supply the dataset separately, we have a number
 * of errors that don't take place if we include the data directly (like we might normally do in a tool like Vega
 * Editor), so we do this here. We don't do this in `getPatchedVegaSpec`, as this creates too much overhead when
 * parsing the spec.
 */
const getPatchedVegaSpecWithData = (
    spec: Spec,
    values: DatasetValueRow[]
): Spec => {
    logTimeStart('getPatchedVegaSpecWithData');
    logDebug('getPatchedVegaSpecWithData', { spec, values });
    const merged = mergician(spec || {}, {
        data: getPatchedData(spec, values)
    });
    logTimeEnd('getPatchedVegaSpecWithData');
    return merged;
};

/**
 * Apply specific patching operations to a supplied Vega-Lite spec. This applies any specific signals that we don't
 * necessarily want the creator to worry about, but will ensure that the visual functions as expected.
 */
const getPatchedVegaLiteSpec = (spec: TopLevelSpec): TopLevelSpec => {
    const isNsl = isVegaLiteSpecNonStandardLayout(spec);
    return mergician(
        spec,
        isNsl
            ? {
                  params: [...(spec['params'] || []), getSignalPbiContainer()]
              }
            : {
                  height:
                      (spec as ReturnType<typeof normalize>)['height'] ??
                      'container',
                  width:
                      (spec as ReturnType<typeof normalize>)['width'] ??
                      'container',
                  params: [...(spec['params'] || []), getSignalPbiContainer()]
              }
    ) as TopLevelSpec;
};

/**
 * Merge the Vega-Lite spec and dataset values together.
 * @privateRemarks We've found some issues with react-vega, where if we supply the dataset separately, we have a number
 * of errors that don't take place if we include the data directly (like we might normally do in a tool like Vega
 * Editor), so we do this here. We don't do this in `getPatchedVegaLiteSpec`, as this creates too much overhead when
 * parsing the spec.
 */
const getPatchedVegaLiteSpecWithData = (
    spec: TopLevelSpec,
    values: DatasetValueRow[]
): TopLevelSpec => {
    logTimeStart('getPatchedVegaLiteSpecWithData');
    const datasets = {
        ...(spec?.datasets ?? {}),
        [`${DATASET_DEFAULT_NAME}`]: values
    };
    const merged = mergician(spec || {}, {
        datasets
    }) as TopLevelSpec;
    logTimeEnd('getPatchedVegaLiteSpecWithData');
    return merged;
};

/**
 * Due to spec patching, we get quite verbose error messages if the spec is invalid. This will contain the raw dataset
 * and other things we add, so to prevent confusing the user, we'll just redact the JSON from the message.
 */
const getRedactedError = (message: string) => {
    return message.replace(/(Invalid specification) (\{.*\})/g, '$1');
};

/**
 * We only need to parse a specification if key information changes between
 * events. This is a simple equality check against that key information.
 *
 * @privateRemarks current events where a spec may need to be checked and re-
 * parsed if necessary are:
 *  - dataset updated (in dataset slice)
 *  - dataset selectors updated (in dataset slice)
 *  - visual properties change during update (spec, config, provider, viewport)
 *      and dataset has been processed
 */
export const isSpecificationVolatile = (
    prev: SpecificationComparisonOptions,
    next: SpecificationComparisonOptions
) => {
    const omitList = ['datasetHash', 'values'];
    const newPrev = omit(prev, omitList);
    const newNext = omit(next, omitList);
    logDebug('isSpecificationVolatile', { newPrev, newNext });
    return !deepEqual(newPrev, newNext);
};

/**
 * If the Vega-Lite spec uses facet, vconcat or hconcat, we need to ensure that we don't patch the spec with the
 * viewport dimensions. This is because the spec is not the top-level spec, but a child of the facet/vconcat/hconcat
 * spec. We'll need to look at the spec and determine if it's a non-standard layout.
 */
const isVegaLiteSpecNonStandardLayout = (spec: TopLevelSpec) =>
    'facet' in spec || 'hconcat' in spec || 'vconcat' in spec;
