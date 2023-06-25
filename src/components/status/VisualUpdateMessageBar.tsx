import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Link } from '@fluentui/react/lib/Link';
import { shallow } from 'zustand/shallow';

import { linkStyles } from '../../core/ui/fluent';
import NotificationMessageBar from '../elements/NotificationMessageBar';
import {
    getVersionChangeDetail,
    getVersionComparatorInfo
} from '../../core/utils/versioning';
import { hostServices } from '../../core/services';
import { getConfig } from '../../core/utils/config';
import { dismissVersionNotification } from '../../core/ui/commands';
import store from '../../store';
import { logRender } from '../../features/logging';
import { getI18nValue } from '../../features/i18n';

const VisualUpdateMessageBar: React.FC = () => {
    const { showVersionNotification } = store(
        (state) => ({
            showVersionNotification:
                state.visualSettings.developer.showVersionNotification
        }),
        shallow
    );
    const change = getVersionChangeDetail();
    const visible = showVersionNotification;
    const { current, last } = getVersionComparatorInfo();
    const dismissAction = () => dismissVersionNotification();
    const messageBarType =
        (change === 'increase' && MessageBarType.warning) ||
        (change === 'decrease' && MessageBarType.warning);
    const openInteractivityLink = () => {
        hostServices.launchUrl(
            getConfig().providerResources.deneb.changelogDocumentationUrl
        );
    };
    const message = () => {
        switch (change) {
            case 'increase':
                return (
                    <>
                        {getI18nValue('Notification_Update_Increase', [
                            last.denebVersion,
                            current.denebVersion
                        ])}{' '}
                        <Link
                            styles={linkStyles}
                            onClick={openInteractivityLink}
                        >
                            {getI18nValue('Link_Changelog')}.
                        </Link>
                    </>
                );
            case 'decrease':
                return (
                    <>
                        {getI18nValue(
                            getI18nValue('Notification_Update_Decrease'),
                            [current.denebVersion, last.denebVersion]
                        )}
                    </>
                );
            default:
                return <></>;
        }
    };
    logRender('VisualUpdateMesageBar');
    return (
        <NotificationMessageBar
            dismissAction={dismissAction}
            messageBarType={messageBarType}
            visible={visible}
        >
            {message()}
        </NotificationMessageBar>
    );
};

export default VisualUpdateMessageBar;
