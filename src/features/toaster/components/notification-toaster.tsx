import React from 'react';
import { shallow } from 'zustand/shallow';

import { FluentProvider, Toaster, useId } from '@fluentui/react-components';
import store from '../../../store';
import {
    TOASTER_ID,
    TOAST_OFFSET_HORIZONTAL_EDITOR,
    TOAST_OFFSET_HORIZONTAL_VISUAL,
    TOAST_OFFSET_VERTICAL_EDITOR,
    TOAST_OFFSET_VERTICAL_VISUAL
} from '../../../constants';
import { NotificationApplyChanges } from './notification-apply-changes';
import { NotificationCrossFilterExceeded } from './notification-cross-filter-exceeded';
import { getDenebTheme, THEME_DEFAULT } from '@deneb-viz/app-core';

export const NotificationToaster: React.FC = () => {
    const { mode } = store(
        (state) => ({
            datasetHasSelectionAborted: state.datasetHasSelectionAborted,
            mode: state.interface.mode,
            selectionMaxDataPoints:
                state.visualSettings.vega.interactivity.selectionMaxDataPoints
                    .value
        }),
        shallow
    );
    const toasterId = useId(TOASTER_ID);
    return (
        <FluentProvider theme={getDenebTheme(THEME_DEFAULT)}>
            <>
                <Toaster
                    toasterId={toasterId}
                    offset={{
                        horizontal:
                            mode === 'Editor'
                                ? TOAST_OFFSET_HORIZONTAL_EDITOR
                                : TOAST_OFFSET_HORIZONTAL_VISUAL,
                        vertical:
                            mode === 'Editor'
                                ? TOAST_OFFSET_VERTICAL_EDITOR
                                : TOAST_OFFSET_VERTICAL_VISUAL
                    }}
                    position='top-end'
                />
                <NotificationCrossFilterExceeded toasterId={toasterId} />
                <NotificationApplyChanges toasterId={toasterId} />
            </>
        </FluentProvider>
    );
};
