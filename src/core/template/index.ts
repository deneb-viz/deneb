export {
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider,
    getEscapedReplacerPattern,
    getExportTemplate,
    getExportFieldTokenPatterns,
    getFieldExpression,
    getInteractivityPropsFromTemplate,
    getNewExportTemplateMetadata,
    getPlaceholderResolutionStatus,
    getReplacedTemplate,
    getReducedPlaceholdersForMetadata,
    getResequencedMetadata,
    getSpecWithFieldPlaceholders,
    getTemplatePlaceholderKey,
    onTemplateFileSelect,
    resolveTemplatesForProvider,
    resolveValueDescriptor,
    resolveVisualMetaToDatasetField,
    updateExportState,
    validateSpecificationForExport
};

import powerbi from 'powerbi-visuals-api';
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

import { Spec } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { v4 as uuidv4 } from 'uuid';
import Ajv from 'ajv';
import ErrorObject = Ajv.ErrorObject;
import merge from 'lodash/merge';
import reduce from 'lodash/reduce';

import { getParsedConfigFromSettings } from '../vega';
import {
    IDenebTemplateMetadata,
    ITemplateDatasetField,
    TDatasetFieldType
} from './schema';
import { getJsonAsIndentedString } from '../utils/json';
import { getConfig, getVisualMetadata } from '../utils/config';
import { getState } from '../../store';

import * as schema_v1 from '../../../schema/deneb-template-usermeta-v1.json';
import { i18nValue } from '../ui/i18n';
import { determineProviderFromSpec, TSpecProvider } from '../vega';
import { isFeatureEnabled } from '../utils/features';
import { IVisualValueMetadata } from '../data/dataset';
import { ITemplateImportPayload } from '../../store/template';

/**
 * Used to indicate which part of the export dialog has focus.
 */
type TExportOperation = 'information' | 'dataset' | 'template';

/**
 * Stages we go through when exporting a template so that the interface can respond accordingly.
 */
type TTemplateExportState =
    | 'None'
    | 'Validating'
    | 'Editing'
    | 'Success'
    | 'Error';

/**
 * Stages we go through when importing a template so that the interface can respond accordingly.
 */
type TTemplateImportState =
    | 'None'
    | 'Supplied'
    | 'Loading'
    | 'Validating'
    | 'Success'
    | 'Error';

/**
 * Used to manage regex match/replace for portions of a template that represent fields from the dataset.
 */
interface ITemplatePattern {
    match: string;
    replacer: string;
}

/**
 * Extension of `TSpecProvider`, providing an `import` value in addition to `vega` and `vegaLite`.
 */
type TTemplateProvider = TSpecProvider | 'import';

/**
 * When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are suitably escaped so that we don't
 * inadvertently mangle them. Returns escaped string, suitable for pattern matching if any special characters are used.
 */
const getEscapedReplacerPattern = (value: string) =>
    value.replace(/[-\/\\^$*+?.()&|[\]{}]/g, '\\$&');

/**
 * As fields can be used in a variety of places in a Vega specification, this generates an array of regex patterns we should use to match eligible placeholders
 * in export templates. All patterns should contain three capture groups:
 *
 *  - `$1`: Preceding pattern used to identify placeholder
 *  - `$2`: The resolved field placeholder
 *  - `$3`: Trailing pattern used to identify placeholder
 *
 * Returns ITemplatePattern array of RegEx patterns that should match all occurrences of specified placeholder name within a spec, and the replacement string
 * that references these capture groups, as well as any necessary adjustments.
 */
const getExportFieldTokenPatterns = (name: string): ITemplatePattern[] => {
    const namePattern = getEscapedReplacerPattern(name);
    return [
        { match: `(")(${namePattern})(")`, replacer: '$1$2$3' },
        { match: `(\\\.)(${namePattern})()`, replacer: `['$2']$3` },
        { match: `(')(${namePattern})(')`, replacer: '$1$2$3' }
    ];
};

/**
 * Logic to create a global matching RegEx for a supplied string-based expression.
 */
const getFieldExpression = (exp: string) => new RegExp(exp, 'g');

/**
 * Combines spec, config and specified metadata to produce a valid JSON template for export.
 */
const getExportTemplate = () => {
    const { editorSpec, visualSettings } = getState();
    const { vega } = visualSettings;
    const { providerResources } = getConfig();
    const vSchema = (
        (vega.provider === 'vega' && providerResources.vega) ||
        providerResources.vegaLite
    ).schemaUrl;
    const baseObj = {
        $schema: vSchema,
        usermeta: {},
        config: {}
    };
    const usermeta = resolveExportUserMeta();
    const processedSpec = getSpecWithFieldPlaceholders(
        JSON.stringify(editorSpec.spec),
        usermeta.dataset
    );
    const outSpec = merge(
        baseObj,
        { usermeta },
        { config: getParsedConfigFromSettings() },
        JSON.parse(processedSpec)
    );
    return getJsonAsIndentedString(outSpec);
};

/**
 * For a given spec and template metadata, create the necessary placeholders for all fields used
 * to that they can be safely replaced.
 */
const getSpecWithFieldPlaceholders = (
    spec: string,
    dataset: ITemplateDatasetField[]
) => {
    return reduce(
        dataset,
        (result, value) =>
            replaceExportTemplatePlaceholders(
                result,
                value.namePlaceholder,
                value.key
            ),
        spec
    );
};

/**
 * For supplied template, ensure that we can obtain interactivity properties from it.
 */
const getInteractivityPropsFromTemplate = (template: Spec | TopLevelSpec) =>
    (<IDenebTemplateMetadata>template?.usermeta)?.interactivity || null;

/**
 * Instantiates a new object for export template metadata, ready for population.
 */
const getNewExportTemplateMetadata = (): IDenebTemplateMetadata => {
    const visualMetadata = getVisualMetadata(),
        { metadataVersion } = getConfig().templates;
    return {
        deneb: {
            build: visualMetadata.version,
            metaVersion: metadataVersion,
            provider: null
        },
        information: {
            name: null,
            description: null,
            uuid: uuidv4(),
            generated: null,
            author: null
        },
        dataset: []
    };
};

/**
 * Enumerate a template's placeholders and confirm they all have values supplied by the user. If a template doesn't have any placeholders then this will
 * also be regarded as fulfilled.
 */
const getPlaceholderResolutionStatus = (template: Spec | TopLevelSpec) => {
    const usermeta = <IDenebTemplateMetadata>template?.usermeta;
    return (
        !usermeta.dataset ||
        usermeta.dataset?.length === 0 ||
        usermeta.dataset.filter((ph) => !ph.suppliedObjectName).length === 0
    );
};

/**
 * For a supplied template, substitute placeholder values and return a stringified representation of the object.
 */
const getReplacedTemplate = (template: Spec | TopLevelSpec) => {
    let templateToApply = { ...template };
    delete templateToApply.$schema;
    delete templateToApply.config;
    delete templateToApply.usermeta;
    const { dataset } = <IDenebTemplateMetadata>template?.usermeta || {};
    const spec = getJsonAsIndentedString(templateToApply);
    return getReducedPlaceholdersForMetadata(dataset, spec);
};

/**
 * For all supplied template fields, perform a replace on all tokens and return the new spec.
 */
const getReducedPlaceholdersForMetadata = (
    dataset: ITemplateDatasetField[],
    spec: string
) =>
    reduce(
        dataset,
        (result, value, index) => {
            const pattern = getFieldExpression(
                getEscapedReplacerPattern(getTemplatePlaceholderKey(index))
            );
            return result.replace(pattern, value.suppliedObjectName);
        },
        spec
    );

/**
 * Assign numeric keys - suitable for templating - to an `IVisualValueMetadata` object, based on the order in which it
 * is reduced.
 */
const getResequencedMetadata = (metadata: IVisualValueMetadata) => {
    let keyCount = 0;
    return reduce(
        metadata,
        (result, value, key) => {
            value.templateMetadata.key = getTemplatePlaceholderKey(keyCount);
            result[key] = value;
            keyCount++;
            return result;
        },
        {}
    );
};

/**
 * When a template JSON file is selected for import, this defines the logic for reading the file and parsing it to ensure that it is both valid JSON, and
 * also contains the necessary metadata to provide data role substitution to the end-user. This will dispatch the necessary state to the store for further
 * action as required.
 */
const onReaderLoad = (event: ProgressEvent<FileReader>, templateFile: File) => {
    updateImportState('Validating');
    let templateFileRawContent = event.target.result.toString(),
        templateToApply: Spec | TopLevelSpec;
    try {
        templateToApply = JSON.parse(templateFileRawContent);
    } catch (e) {
        updateImportError('Template_Import_Invalid_Json');
        return;
    }
    const ajv = new Ajv({
        format: 'full'
    });
    let provider = determineProviderFromSpec(templateToApply);
    if (ajv.validate(schema_v1, templateToApply?.usermeta)) {
        updateImportSuccess({
            templateFile,
            templateFileRawContent,
            templateToApply,
            provider
        });
    } else {
        updateImportError('Template_Import_Not_Deneb', ajv.errors);
    }
};

/**
 * Attempt to load the selected template JSON file and validate it.
 */
const onTemplateFileSelect = (files: FileList) => {
    updateImportState('Supplied');
    const reader = new FileReader();
    if (files?.length === 1 && files[0]?.type === 'application/json') {
        updateImportState('Loading');
        const file = files[0];
        reader.onload = (event) => onReaderLoad(event, file);
        reader.readAsText(file);
    } else {
        updateImportError('Template_Import_Incorrect_Type');
    }
};

/**
 * When exporting a template, any occurrences of columns or measures need to be replaced in the spec. This takes a given stringified `template`, and will:
 *
 *  1. Encode the supplied _name_ for safe encapsulation.
 *  2. Iterate through known patterns where the supplied placeholder _name_ could be referred to for encodings and expressions and replace them with the
 *      supplied `token` in the supplied `template`.
 *  3. Return the modified _template_.
 *
 * Returns `template` with all `name` occurrences replaced with `token`.
 */
const replaceExportTemplatePlaceholders = (
    template: string,
    name: string,
    token: string
) => {
    let replacedTemplate = template;
    getExportFieldTokenPatterns(name).forEach(
        (pattern) =>
            (replacedTemplate = replaceTemplateFieldWithToken(
                replacedTemplate,
                pattern,
                token
            ))
    );
    return replacedTemplate;
};

/**
 * Generates a suitable `usermeta` object for the current `templateReducer` state and provides suitable defaults if they are missing, so that generated
 * export templates make sense (as much as possible).
 */
const resolveExportUserMeta = (): IDenebTemplateMetadata => {
    const visualMetadata = getVisualMetadata(),
        { metadataVersion } = getConfig().templates,
        {
            templateExportMetadata,
            templatePreviewImageDataUri,
            templateIncludePreviewImage
        } = getState(),
        { vega } = getState().visualSettings;
    return {
        deneb: {
            build: visualMetadata.version,
            metaVersion: metadataVersion,
            provider: <TSpecProvider>vega.provider
        },
        interactivity: {
            tooltip: vega.enableTooltips,
            contextMenu: vega.enableContextMenu,
            selection: vega.enableSelection,
            dataPointLimit: vega.selectionMaxDataPoints
        },
        information: {
            name:
                templateExportMetadata?.information?.name ||
                i18nValue('Template_Export_Information_Name_Empty'),
            description:
                templateExportMetadata?.information?.description ||
                i18nValue('Template_Export_Information_Description_Empty'),
            author:
                templateExportMetadata?.information?.author ||
                i18nValue('Template_Export_Author_Name_Empty'),
            uuid: templateExportMetadata?.information?.uuid || uuidv4(),
            generated: new Date().toISOString(),
            previewImageBase64PNG:
                isFeatureEnabled('templateExportPreviewImages') &&
                templateIncludePreviewImage
                    ? templatePreviewImageDataUri
                    : undefined
        },
        dataset: templateExportMetadata?.dataset.map((d, di) => {
            return {
                key: getTemplatePlaceholderKey(di),
                name: d.name || d.namePlaceholder,
                description: d.description || '',
                type: d.type,
                kind: d.kind,
                namePlaceholder: d.namePlaceholder
            };
        })
    };
};

/**
 * Consistently format a dataset field's index into a suitable placeholder
 * */
const getTemplatePlaceholderKey = (i: number) => `__${i}__`;

const resolveTemplatesForProvider = () => {
    const { templateProvider, vega, vegaLite } = getState();
    return (templateProvider === 'vegaLite' && vegaLite) || vega;
};

/**
 * For a supplied (stringified) _template_, RegEx _pattern_ and replacement _token_, perform a global replace on all occurrences and return it.
 *
 * `pattern` is a valid RegEx pattern to search template for and replace on (with capture group $2 representing the field).
 *
 * As per notes in `getExportFieldTokenPatterns`, this pattern requires three capture groups in its definition in order to ensure that preceding
 * and trailing patterns used to identify a placeholder are preserved.
 *
 * Returns processed _template_, with _token_(s) in-place of all valid _pattern_ occurrences.
 */
const replaceTemplateFieldWithToken = (
    template: string,
    pattern: ITemplatePattern,
    token: string
) =>
    template.replace(
        getFieldExpression(pattern.match),
        pattern.replacer.replace('$2', token)
    );

/**
 * For a given column or measure (or template placeholder), resolve its type against the corresponding Power BI value descriptor.
 */
const resolveValueDescriptor = (
    type: ValueTypeDescriptor
): TDatasetFieldType => {
    switch (true) {
        case type?.bool:
            return 'bool';
        case type?.text:
            return 'text';
        case type?.numeric:
            return 'numeric';
        case type?.dateTime:
            return 'dateTime';
        default:
            return 'other';
    }
};

/**
 * For a given `DataViewMetadataColumn`, and its encoded name produces a new `ITemplateDatasetField` object that can be used for templating purposes.
 */
const resolveVisualMetaToDatasetField = (
    metadata: DataViewMetadataColumn,
    encodedName: string
): ITemplateDatasetField => {
    return {
        key: metadata.queryName,
        name: encodedName,
        namePlaceholder: encodedName,
        description: '',
        kind: (metadata.isMeasure && 'measure') || 'column',
        type: resolveValueDescriptor(metadata.type)
    };
};

/**
 * Persist the supplied export error information to the store.
 */
const updateExportError = (i18nKey: string) => {
    getState().updateTemplateExportError(i18nValue(i18nKey));
};

/**
 * Persist the supplied `TTemplateExportState` to Deneb's store.
 */
const updateExportState = (state: TTemplateExportState) => {
    getState().updateTemplateExportState(state);
};

/**
 * Persist the supplied import error information to the store.
 */
const updateImportError = (i18nKey: string, errors: ErrorObject[] = []) => {
    getState().updateTemplateImportError({
        templateImportErrorMessage: i18nValue(i18nKey),
        templateSchemaErrors: errors
    });
};

/**
 * Persist the supplied `TTemplateImportState` to Deneb's store.
 */
const updateImportState = (state: TTemplateImportState) => {
    getState().updateTemplateImportState(state);
};

/**
 * Persist the resolved template payload to the store.
 */
const updateImportSuccess = (payload: ITemplateImportPayload) => {
    getState().updateTemplateImportSuccess(payload);
};

/**
 * Checks to see if current spec is valid and updates store state for UI accordingly.
 */
const validateSpecificationForExport = () => {
    const { editorSpec } = getState();
    updateExportState('Validating');
    if (editorSpec.status === 'valid') {
        updateExportState('Editing');
    } else {
        updateExportError('Template_Export_Bad_Spec');
    }
};
