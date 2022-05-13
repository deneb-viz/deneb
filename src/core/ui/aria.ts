import { i18nValue } from './i18n';

export const resolveAutoApplyToggleAria = (enabled: boolean) =>
    enabled
        ? i18nValue('Button_Auto_Apply_Off')
        : i18nValue('Button_Auto_Apply_On');

export const resolveEditorPanePivotAria = () => i18nValue('Pivot_Editor_Pane');

export const resolveEditorDebugPaneToggleAria = (expanded: boolean) =>
    expanded ? 'Tooltip_Collapse_Debug_Pane' : 'Tooltip_Expand_Debug_Pane';
