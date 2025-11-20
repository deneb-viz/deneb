import React, { useMemo } from 'react';

import { Link } from '@fluentui/react-components';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { getI18nValue, launchUrl } from '@deneb-viz/powerbi-compat/visual-host';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { useDenebState } from '../../../state';
import { getVegaProviderI18n } from '../../../lib/vega';

export const VersionChangeContent = () => {
    const { changeType, current, previous, showMigrationDialog, vegaProvider } =
        useDenebState((state) => ({
            changeType: state.migration.changeType,
            current: state.migration.current,
            previous: state.migration.previous,
            showMigrationDialog: state.migration.showMigrationDialog,
            vegaProvider: state.visualSettings.vega.output.provider
                .value as SpecProvider
        }));
    const providerName = getVegaProviderI18n(vegaProvider);
    const items = useMemo(
        () => (
            <ul>
                <li>
                    {getI18nValue('Text_Dialog_Body_Version_Change_Deneb', [
                        previous?.denebVersion,
                        current?.denebVersion
                    ])}
                </li>
                <li>
                    {getI18nValue('Text_Dialog_Body_Version_Change_Provider', [
                        previous?.providerVersion,
                        current?.providerVersion,
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
                            previous?.denebVersion,
                            current?.denebVersion
                        ])}
                    </>
                );
            case 'decrease':
                return (
                    <>
                        {getI18nValue(
                            getI18nValue('Text_Dialog_Body_Version_Decrease'),
                            [current?.denebVersion, previous?.denebVersion]
                        )}
                    </>
                );
            default:
                return <></>;
        }
    }, [showMigrationDialog]);
    const openLink = () => {
        launchUrl(
            PROVIDER_RESOURCE_CONFIGURATION.deneb.changelogDocumentationUrl
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
