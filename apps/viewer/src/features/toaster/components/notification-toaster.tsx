import { FluentProvider, Toaster, useId } from '@fluentui/react-components';

import { NotificationCrossFilterExceeded } from './notification-cross-filter-exceeded';
import { getDenebTheme, THEME_DEFAULT } from '@deneb-viz/app-core';
import {
    TOAST_OFFSET_HORIZONTAL_VISUAL,
    TOAST_OFFSET_VERTICAL_VISUAL,
    TOASTER_ID
} from '../constants';

export const NotificationToaster = () => {
    const toasterId = useId(TOASTER_ID);
    return (
        <FluentProvider theme={getDenebTheme(THEME_DEFAULT)}>
            <>
                <Toaster
                    toasterId={toasterId}
                    offset={{
                        horizontal: TOAST_OFFSET_HORIZONTAL_VISUAL,
                        vertical: TOAST_OFFSET_VERTICAL_VISUAL
                    }}
                    position='top-end'
                />
                <NotificationCrossFilterExceeded toasterId={toasterId} />
            </>
        </FluentProvider>
    );
};
