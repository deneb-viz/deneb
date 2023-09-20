import React from 'react';
import { shallow } from 'zustand/shallow';

import { FluentProvider, Toaster, useId } from '@fluentui/react-components';
import store from '../../../store';
import { Themes } from '../../interface';
import {
    TOASTER_ID,
    TOAST_OFFSET_HORIZONTAL_EDITOR,
    TOAST_OFFSET_HORIZONTAL_VISUAL,
    TOAST_OFFSET_VERTICAL_EDITOR,
    TOAST_OFFSET_VERTICAL_VISUAL
} from '../../../constants';
import { NotificationApplyChanges } from './notification-apply-changes';
import { NotificationCrossFilterExceeded } from './notification-cross-filter-exceeded';

export const NotificationToaster: React.FC = () => {
    const { mode } = store(
        (state) => ({
            datasetHasSelectionAborted: state.datasetHasSelectionAborted,
            mode: state.interface.mode,
            selectionMaxDataPoints:
                state.visualSettings.vega.selectionMaxDataPoints
        }),
        shallow
    );
    const toasterId = useId(TOASTER_ID);
    return (
        <FluentProvider theme={Themes.light}>
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
