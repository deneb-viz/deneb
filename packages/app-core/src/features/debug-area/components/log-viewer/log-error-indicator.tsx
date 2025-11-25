import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { Warning20Filled, Warning20Regular } from '@fluentui/react-icons';
import { tokens } from '@fluentui/tokens';

import { useDenebState } from '../../../../state';

const MODIFIER = '%F0%9F%A6%89';

export const LogErrorIndicator = () => {
    const { errors, fourd3d3d, warns } = useDenebState(
        (state) => ({
            errors: state.specification.errors,
            fourd3d3d: state.visual4d3d3d,
            warns: state.specification.warns
        }),
        shallow
    );
    const indicator = useMemo(() => {
        switch (true) {
            case fourd3d3d:
                return (
                    <span style={{ fontSize: '12pt' }}>
                        {decodeURIComponent(MODIFIER)}
                    </span>
                );
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
