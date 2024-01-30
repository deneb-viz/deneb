import powerbi from 'powerbi-visuals-api';
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;

import forIn from 'lodash/forIn';
import reduce from 'lodash/reduce';

import * as schema_v1 from '@deneb-viz/template-usermeta-schema';
import { IVisualDatasetFields } from '../../core/data';
import { getDatasetFieldsInclusive } from '../../core/data/fields';
import { getVegaSettings } from '../../core/vega';
import { getCrossHighlightRegExpAlternation } from '../interactivity';
import { getCleanEditorJson } from '../specification';
import { ITemplatePattern, TemplateDatasetColumnRole } from './types';
import { getFormatFieldRegExpAlternation } from '../dataset';
import { getI18nValue } from '../i18n';
import { useTemplateStyles } from './components';
import { IAceEditor } from 'react-ace/lib/types';
import {
    UsermetaDatasetField,
    UsermetaDatasetFieldType
} from '@deneb-viz/core-dependencies';

/**
 * Used for validation of text field lengths vs. generated schema.
 */
export const TEMPLATE_DATASET_FIELD_PROPS =
    schema_v1.definitions.UsermetaDatasetField.properties;

export const TEMPLATE_INFORMATION_PROPS =
    schema_v1.definitions.UsermetaInformation.properties;

/**
 * For the given field key, check the spec for its occurrence using all established RegEx patterns.
 */
const doesSpecContainKeyForMetadata = (
    key: string,
    spec: string,
    metadata: IVisualDatasetFields
) =>
    reduce(
        getExportFieldTokenPatterns(key),
        (result, expr) => {
            return (
                (getFieldExpression(expr.match).test(spec) &&
                    key in metadata) ||
                result
            );
        },
        false
    );

/**
 * Resolve class name based on role.
 */
export const getDataColumnClass = (role: TemplateDatasetColumnRole) => {
    const classes = useTemplateStyles();
    switch (role) {
        case 'type':
            return classes.datasetDataType;
        case 'name':
        case 'originalName':
        case 'exportName':
            return classes.datasetColumnName;
        case 'assignment':
            return classes.datasetColumnAssignment;
        default:
            return '';
    }
};

/**
 * Resolve heading column text based on role.
 */
export const getDataColumnText = (role: TemplateDatasetColumnRole) => {
    switch (role) {
        case 'name':
            return getI18nValue('Text_Template_Dataset_Field_Name');
        case 'exportName':
            return getI18nValue('Text_Template_Dataset_Field_Name_Export');
        case 'originalName':
            return getI18nValue('Text_Template_Dataset_Field_OriginalName');
        case 'assignment':
            return getI18nValue('Text_Template_Dataset_Field_Assignment');
        case 'description':
        case 'exportDescription':
            return getI18nValue('Text_Template_Dataset_Field_Description');
        default:
            return '';
    }
};

/**
 * For a given column or measure (or template placeholder), resolve the UI
 * tooltip/title text for its data type.
 */
export const getDataTypeIconTitle = (type: UsermetaDatasetFieldType) => {
    switch (type) {
        case 'bool':
            return getI18nValue('Template_Type_Descriptor_Bool');
        case 'text':
            return getI18nValue('Template_Type_Descriptor_Text');
        case 'numeric':
            return getI18nValue('Template_Type_Descriptor_Numeric');
        case 'dateTime':
            return getI18nValue('Template_Type_Descriptor_DateTime');
        default:
            return getI18nValue('Template_Import_Not_Deneb');
    }
};

/**
 * When performing placeholder replacements, we need to ensure that special
 * characters used in regex qualifiers are suitably escaped so that we don't
 * inadvertently mangle them. Returns escaped string, suitable for pattern
 * matching if any special characters are used.
 */
export const getEscapedReplacerPattern = (value: string) =>
    value.replace(/[-/\\^$*+?.()&|[\]{}]/g, '\\$&');

/**
 * Process the editor "fields in use" metadata to ensure that we either preserve fields that might have been removed
 * from our datase (and clear out their supplied object name for another attempt), or whether to start again.
 */
const getExistingFieldsInUse = (
    metadata: IVisualDatasetFields,
    renew = false
): IVisualDatasetFields =>
    renew
        ? {}
        : reduce(
              metadata,
              (result, value, key) => {
                  delete value.templateMetadata.suppliedObjectName;
                  result[key] = value;
                  return result;
              },
              <IVisualDatasetFields>{}
          );

/**
 * As fields can be used in a variety of places in a Vega specification, this
 * generates an array of regex patterns we should use to match eligible
 * placeholders in export templates. All patterns should contain three capture
 * groups:
 *
 *  - `$1`: Preceding pattern used to identify placeholder
 *  - `$2`: The resolved field placeholder
 *  - `$3`: Trailing pattern used to identify placeholder
 *
 * Returns `ITemplatePattern` array of RegEx patterns that should match all
 * occurrences of specified placeholder name within a spec, and the replacement
 * string that references these capture groups, as well as any necessary
 * adjustments.
 *
 * Examples of how each entry would get templated for a given field name
 * (in this case `Mean Temperature`):
 *
 * "()(Mean Temperature)(__highlight)?"(?!\s*:)
 * \.()(Mean Temperature)(__highlight)?
 * '()(Mean Temperature)(__highlight)?'
 *
 */
export const getExportFieldTokenPatterns = (
    name: string
): ITemplatePattern[] => {
    const namePattern = getEscapedReplacerPattern(name);
    const alternations = [
        getCrossHighlightRegExpAlternation(),
        getFormatFieldRegExpAlternation()
    ];
    return reduce(
        alternations,
        (result, alternation) => {
            return result.concat([
                {
                    match: `"()(${namePattern})(${alternation})?"(?!\\s*:)`,
                    replacer: '"$1$2$3"'
                },
                {
                    match: `\\.()(${namePattern})(${alternation})?`,
                    replacer: `['$1$2$3']`
                },
                {
                    match: `(')(${namePattern})((?=${alternation}')?)`,
                    replacer: '$1$2$3'
                }
            ]);
        },
        <ITemplatePattern[]>[]
    );
};

/**
 * Logic to create a global matching RegEx for a supplied string-based
 * expression.
 */
export const getFieldExpression = (exp: string) => new RegExp(exp, 'g');

/**
 * Interrogate the current spec against the dataset metadata and existing list of fields in use from the store for
 * known field patterns and get an `IVisualValueMetadata` representation of any that have been identified since the
 * last execution. We can use this to compare to the current dataset to see if there are gaps.
 */
export const getFieldsInUseFromSpec = (
    metadata: IVisualDatasetFields,
    editorFieldsInUse: IVisualDatasetFields,
    specEditor?: IAceEditor,
    renew = false
): IVisualDatasetFields => {
    const { jsonSpec } = getVegaSettings();
    const spec = getCleanEditorJson('Spec', specEditor) || jsonSpec;
    const newFieldsInUse = getExistingFieldsInUse(editorFieldsInUse, renew);
    forIn(getDatasetFieldsInclusive(metadata), (value, key) => {
        const found = doesSpecContainKeyForMetadata(key, spec, metadata);
        if (found) {
            value.templateMetadata.suppliedObjectName = key;
            newFieldsInUse[key] = value;
        } else {
            delete newFieldsInUse[key];
        }
    });
    return getResequencedMetadata(newFieldsInUse);
};

/**
 * For all supplied template fields, perform a replace on all tokens and return
 * the new spec.
 */
export const getReducedPlaceholdersForMetadata = (
    dataset: UsermetaDatasetField[],
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
 * Assign numeric keys - suitable for templating - to an `IVisualValueMetadata`
 * object, based on the order in which it is reduced.
 */
const getResequencedMetadata = (metadata: IVisualDatasetFields) => {
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
 * For a given spec and template metadata, create the necessary placeholders
 * for all fields used to that they can be safely replaced.
 */
export const getTemplatedSpecification = (
    spec: string,
    dataset: UsermetaDatasetField[]
) => {
    return reduce(
        dataset,
        (result, value) =>
            replaceTemplatePlaceholders(
                result,
                value.namePlaceholder,
                value.key
            ),
        spec
    );
};

/**
 * Consistently format a dataset field's index into a suitable placeholder
 * */
export const getTemplatePlaceholderKey = (i: number) => `__${i}__`;

/**
 * For a supplied (stringified) _template_, RegEx _pattern_ and replacement
 * _token_, perform a global replace on all occurrences and return it.
 *
 * `pattern` is a valid RegEx pattern to search template for and replace on
 * (with capture group $2 representing the field).
 *
 * As per notes in `getExportFieldTokenPatterns`, this pattern requires three
 * capture groups in its definition in order to ensure that preceding and
 * trailing patterns used to identify a placeholder are preserved.
 *
 * Returns processed _template_, with _token_(s) in-place of all valid _pattern_
 * occurrences.
 */
export const replaceTemplateFieldWithToken = (
    template: string,
    pattern: ITemplatePattern,
    token: string
) =>
    template.replace(
        getFieldExpression(pattern.match),
        pattern.replacer.replace('$2', token)
    );

/**
 * When exporting a template, any occurrences of columns or measures need to be
 * replaced in the spec. This takes a given stringified `template`, and will:
 *
 *  1. Encode the supplied _name_ for safe encapsulation.
 *  2. Iterate through known patterns where the supplied placeholder _name_
 *      could be referred to for encodings and expressions and replace them
 *      with the supplied `token` in the supplied `template`.
 *  3. Return the modified _template_.
 *
 * Returns `template` with all `name` occurrences replaced with `token`.
 */
const replaceTemplatePlaceholders = (
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
 * For a given column or measure (or template placeholder), resolve its type
 * against the corresponding Power BI value descriptor.
 */
export const resolveValueDescriptor = (
    type: ValueTypeDescriptor
): UsermetaDatasetFieldType => {
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
 * For a given `DataViewMetadataColumn`, and its encoded name produces a new
 * `ITemplateDatasetField` object that can be used for templating purposes.
 */
export const resolveVisualMetaToDatasetField = (
    metadata: DataViewMetadataColumn,
    encodedName: string
): UsermetaDatasetField => {
    return {
        key: metadata.queryName,
        name: encodedName,
        namePlaceholder: encodedName,
        description: '',
        kind: (metadata.isMeasure && 'measure') || 'column',
        type: resolveValueDescriptor(metadata.type)
    };
};
