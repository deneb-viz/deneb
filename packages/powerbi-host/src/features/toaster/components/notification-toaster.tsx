import { type ReactNode } from 'react';
import { FluentProvider, Toaster, useId } from '@fluentui/react-components';

import { NotificationCrossFilterExceeded } from './notification-cross-filter-exceeded';
import {
    getDenebTheme,
    THEME_DEFAULT,
    useDenebState
} from '@deneb-viz/app-core';
import {
    TOAST_OFFSET_HORIZONTAL_EDITOR,
    TOAST_OFFSET_HORIZONTAL_VISUAL,
    TOAST_OFFSET_VERTICAL_EDITOR,
    TOAST_OFFSET_VERTICAL_VISUAL,
    TOASTER_ID
} from '../constants';

type NotificationToasterProps = {
    /** The visual's own notifications, given the id of the toaster they show in. */
    notifications?: (toasterId: string) => ReactNode;
};

/**
 * Shows the visual's toast notifications: the ones every visual has, such
 * as the cross-filter limit, plus any the visual adds.
 */
export const NotificationToaster = ({
    notifications
}: NotificationToasterProps) => {
    const mode = useDenebState((state) => state.interface.type);
    const toasterId = useId(TOASTER_ID);
    return (
        <FluentProvider theme={getDenebTheme(THEME_DEFAULT)}>
            <>
                <Toaster
                    toasterId={toasterId}
                    offset={{
                        horizontal:
                            mode === 'editor'
                                ? TOAST_OFFSET_HORIZONTAL_EDITOR
                                : TOAST_OFFSET_HORIZONTAL_VISUAL,
                        vertical:
                            mode === 'editor'
                                ? TOAST_OFFSET_VERTICAL_EDITOR
                                : TOAST_OFFSET_VERTICAL_VISUAL
                    }}
                    position='top-end'
                />
                <NotificationCrossFilterExceeded toasterId={toasterId} />
                {notifications?.(toasterId)}
            </>
        </FluentProvider>
    );
};
