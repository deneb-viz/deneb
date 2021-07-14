import isObject from 'lodash/isObject';
import reduce from 'lodash/reduce';
import toString from 'lodash/toString';

import { i18nValue } from '../ui/i18n';
import { isInteractivityReservedWord } from '.';
import { getJsonAsIndentedString } from '../utils/json';

export const getRedactedTooltipObject = (object: Object) =>
    reduce(
        object,
        (result, value, key) => {
            result[key] = isInteractivityReservedWord(key)
                ? i18nValue('Selection_KW_Present')
                : value;
            return result;
        },
        {}
    );

export const getSanitisedTooltipValue = (value: any) =>
    isObject(value)
        ? getJsonAsIndentedString(getRedactedTooltipObject(value), 'tooltip')
        : toString(value);
