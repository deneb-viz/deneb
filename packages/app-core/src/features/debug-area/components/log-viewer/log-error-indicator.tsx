import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { Warning20Filled, Warning20Regular } from '@fluentui/react-icons';
import { tokens } from '@fluentui/tokens';

import { useDenebState } from '../../../../state';

export const LogErrorIndicator = () => {
    const { errors, warns } = useDenebState((state) => {
        // Combine parse errors/warnings with runtime errors/warnings
        const parseErrors = state.compilation.result?.errors ?? [];
        const parseWarnings = state.compilation.result?.parsed.warnings ?? [];
        const runtimeErrors = state.compilation.runtimeErrors;
        const runtimeWarnings = state.compilation.runtimeWarnings;
        return {
            errors: [...parseErrors, ...runtimeErrors],
            warns: [...parseWarnings, ...runtimeWarnings]
        };
    }, shallow);
    const indicator = useMemo(() => {
        // Spacer between the label and the icon. The previous label string
        // included a trailing &nbsp; which i18n keys do not; restoring the
        // gap as a margin keeps the indicator from rendering flush against
        // the label.
        const iconStyle = { marginLeft: tokens.spacingHorizontalXS };
        switch (true) {
            case errors.length > 0:
                return (
                    <Warning20Filled
                        primaryFill={tokens.colorPaletteRedForeground1}
                        style={iconStyle}
                    />
                );
            case warns.length > 0:
                return (
                    <Warning20Regular
                        primaryFill={tokens.colorPaletteYellowForeground1}
                        style={iconStyle}
                    />
                );
            default:
                return null;
        }
    }, [warns, errors]);
    return indicator;
};
