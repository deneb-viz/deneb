import React from 'react';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Link } from '@fluentui/react/lib/Link';

import { i18nValue } from '../../core/ui/i18n';
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

const VisualUpdateMessageBar: React.FC = () => {
    const { showVersionNotification } = store(
        (state) => state.visualSettings.developer
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
                        {i18nValue('Notification_Update_Increase', [
                            last.denebVersion,
                            current.denebVersion
                        ])}{' '}
                        <Link
                            styles={linkStyles}
                            onClick={openInteractivityLink}
                        >
                            {i18nValue('Link_Changelog')}.
                        </Link>
                    </>
                );
            case 'decrease':
                return (
                    <>
                        {i18nValue(
                            "You're using a newer version of Deneb ({0} than this specification was authored in ({1}).",
                            [current.denebVersion, last.denebVersion]
                        )}
                    </>
                );
            default:
                return <></>;
        }
    };
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