import React, { useEffect } from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../store';
import {
    clearSelection,
    dispatchCrossFilterAbort
} from '../../features/interactivity';
import { getI18nValue } from '../../features/i18n';
import {
    FluentProvider,
    Link,
    Toast,
    ToastBody,
    ToastFooter,
    ToastTitle,
    ToastTrigger,
    Toaster,
    useId,
    useToastController
} from '@fluentui/react-components';
import { Themes } from '../../features/interface';
import {
    EDITOR_TOAST_OFFSET_HORIZONTAL,
    EDITOR_TOAST_OFFSET_VERTICAL,
    VISUAL_TOAST_OFFSET_HORIZONTAL,
    VISUAL_TOAST_OFFSET_VERTICAL
} from '../../constants';

export const SelectionLimitToaster: React.FC = () => {
    const { datasetHasSelectionAborted, mode, selectionMaxDataPoints } = store(
        (state) => ({
            datasetHasSelectionAborted: state.datasetHasSelectionAborted,
            mode: state.interface.mode,
            selectionMaxDataPoints:
                state.visualSettings.vega.selectionMaxDataPoints
        }),
        shallow
    );
    const toastId = useId('toaster');
    const { dispatchToast, dismissToast } = useToastController(toastId);
    const handleClearSelection = () => {
        dismissToast(toastId);
        clearSelection();
    };
    const notify = () =>
        dispatchToast(
            <Toast>
                <ToastTitle>
                    {getI18nValue(
                        'Text_Toast_Title_Cross_Filter_Limit_Reached'
                    )}
                </ToastTitle>
                <ToastBody
                    subtitle={getI18nValue(
                        'Text_Toast_Subtitle_Cross_Filter_Limit_Reached'
                    )}
                >
                    {getI18nValue(
                        'Text_Toast_Body_Cross_Filter_Limit_Reached',
                        [selectionMaxDataPoints]
                    )}
                </ToastBody>
                <ToastFooter>
                    <ToastTrigger>
                        <Link>{getI18nValue('Text_Toast_Action_Dismiss')}</Link>
                    </ToastTrigger>
                    <Link onClick={handleClearSelection}>
                        {getI18nValue(
                            'Text_Toast_Action_Dismiss_Clear_Selection'
                        )}
                    </Link>
                </ToastFooter>
            </Toast>,
            {
                toastId,
                intent: 'warning',
                onStatusChange: (e, { status: toastStatus }) => {
                    if (toastStatus === 'dismissed') {
                        dispatchCrossFilterAbort();
                    }
                },
                timeout: -1
            }
        );
    useEffect(() => {
        if (datasetHasSelectionAborted) {
            notify();
        }
    }, [datasetHasSelectionAborted]);
    return (
        <FluentProvider theme={Themes.light}>
            <>
                <Toaster
                    toasterId={toastId}
                    offset={{
                        horizontal:
                            mode === 'Editor'
                                ? EDITOR_TOAST_OFFSET_HORIZONTAL
                                : VISUAL_TOAST_OFFSET_HORIZONTAL,
                        vertical:
                            mode === 'Editor'
                                ? EDITOR_TOAST_OFFSET_VERTICAL
                                : VISUAL_TOAST_OFFSET_VERTICAL
                    }}
                    position='top-end'
                />
            </>
        </FluentProvider>
    );
};
