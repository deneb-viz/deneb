import { useMemo } from 'react';

import { Link } from '@fluentui/react-components';
import { PROVIDER_RESOURCE_CONFIGURATION } from '@deneb-viz/configuration';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { useDenebState } from '../../../state';
import { getVegaProviderI18n } from '../../../lib/vega';
import { useDenebPlatformProvider } from '../../deneb-platform';

export const VersionChangeContent = () => {
    const {
        changeType,
        current,
        previous,
        showMigrationDialog,
        vegaProvider,
        translate
    } = useDenebState((state) => ({
        changeType: state.migration.changeType,
        current: state.migration.current,
        previous: state.migration.previous,
        showMigrationDialog: state.migration.showMigrationDialog,
        vegaProvider: state.project.provider as SpecProvider,
        translate: state.i18n.translate
    }));
    const { launchUrl } = useDenebPlatformProvider();
    const providerName = getVegaProviderI18n(vegaProvider);
    const items = useMemo(
        () => (
            <ul>
                <li>
                    {translate('Text_Dialog_Body_Version_Change_Deneb', [
                        previous?.denebVersion,
                        current?.denebVersion
                    ])}
                </li>
                <li>
                    {translate('Text_Dialog_Body_Version_Change_Provider', [
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
                        {translate('Text_Dialog_Body_Version_Increase', [
                            previous?.denebVersion,
                            current?.denebVersion
                        ])}
                    </>
                );
            case 'decrease':
                return (
                    <>
                        {translate(
                            translate('Text_Dialog_Body_Version_Decrease'),
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
                {translate('Text_Dialog_Body_Version_Change_Subtext')}{' '}
                <Link onClick={openLink}>
                    {translate('Text_Link_Changelog')}
                </Link>
            </>
        </div>
    );
};
