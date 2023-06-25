import { getI18nValue } from '../../features/i18n';

export const resolveAutoApplyToggleAria = (enabled: boolean) =>
    enabled
        ? getI18nValue('Button_Auto_Apply_Off')
        : getI18nValue('Button_Auto_Apply_On');

export const resolveEditorPanePivotAria = () =>
    getI18nValue('Pivot_Editor_Pane');

export const resolveEditorDebugPaneToggleAria = (expanded: boolean) =>
    expanded ? 'Tooltip_Collapse_Debug_Pane' : 'Tooltip_Expand_Debug_Pane';
