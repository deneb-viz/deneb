import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { Warning20Filled, Warning20Regular } from '@fluentui/react-icons';
import { tokens } from '@fluentui/tokens';

export const LogErrorIndicator: React.FC = () => {
    const { errors, warns } = store(
        (state) => ({
            errors: state.specification.errors,
            warns: state.specification.warns
        }),
        shallow
    );
    const indicator = useMemo(() => {
        switch (true) {
            case errors.length > 0:
                return (
                    <Warning20Filled
                        primaryFill={tokens.colorPaletteRedForeground1}
                    />
                );
            case warns.length > 0:
                return (
                    <Warning20Regular
                        primaryFill={tokens.colorPaletteYellowForeground1}
                    />
                );
            default:
                return null;
        }
    }, [warns, errors]);
    return indicator;
};
