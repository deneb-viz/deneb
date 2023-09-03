import React, { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { getI18nValue } from '../../i18n';
import { getVegaProvideri18n } from '../../../core/vega';
import { Link } from '@fluentui/react-components';
import { hostServices } from '../../../core/services';
import { getConfig } from '../../../core/utils/config';

export const VersionChangeContent: React.FC = () => {
    const { changeType, current, previous, showMigrationDialog } = store(
        (state) => ({
            changeType: state.migration.changeType,
            current: state.migration.current,
            previous: state.migration.previous,
            showMigrationDialog: state.migration.showMigrationDialog
        }),
        shallow
    );
    const providerName = getVegaProvideri18n();
    const items = useMemo(
        () => (
            <ul>
                <li>
                    {getI18nValue('Text_Dialog_Body_Version_Change_Deneb', [
                        previous.denebVersion,
                        current.denebVersion
                    ])}
                </li>
                <li>
                    {getI18nValue('Text_Dialog_Body_Version_Change_Provider', [
                        previous.providerVersion,
                        current.providerVersion,
                        providerName
                    ])}
                </li>
            </ul>
        ),
        [showMigrationDialog]
    );
    const message = useMemo(() => {
        switch (changeType) {
            case 'increase':
                return (
                    <>
                        {getI18nValue('Text_Dialog_Body_Version_Increase', [
                            previous.denebVersion,
                            current.denebVersion
                        ])}
                    </>
                );
            case 'decrease':
                return (
                    <>
                        {getI18nValue(
                            getI18nValue('Text_Dialog_Body_Version_Decrease'),
                            [current.denebVersion, previous.denebVersion]
                        )}
                    </>
                );
            default:
                return <></>;
        }
    }, [showMigrationDialog]);
    const openLink = () => {
        hostServices.launchUrl(
            getConfig().providerResources.deneb.changelogDocumentationUrl
        );
    };
    return (
        <div>
            {message}
            {items}
            <>
                {getI18nValue('Text_Dialog_Body_Version_Change_Subtext')}{' '}
                <Link onClick={openLink}>
                    {getI18nValue('Text_Link_Changelog')}
                </Link>
            </>
        </div>
    );
};
