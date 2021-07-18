import { i18nValue } from './i18n';

export const resolveAutoApplyLabel = (enabled: boolean) =>
    enabled
        ? i18nValue('Button_Auto_Apply_Off')
        : i18nValue('Button_Auto_Apply_On');
