import { i18nValue } from './i18n';

export const resolveAutoApplyToggleAria = (enabled: boolean) =>
    enabled
        ? i18nValue('Button_Auto_Apply_Off')
        : i18nValue('Button_Auto_Apply_On');

export const resolveEditorPanePivotAria = () => 'Editor Pane Pivot Control';

export const resolveTemplateExportPivotAria = () =>
    'Template Export Options Pivot Control';

export const resolveTemplateProviderPivotAria = () =>
    'Template Provider Selection Pivot Control';
