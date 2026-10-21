import { DataHistogram24Regular } from '@fluentui/react-icons';

import { StatusMessage } from './status-message';

/**
 * Shown to readers when there is nothing to render. Readers can't set the
 * visual up, so there is no call to action.
 */
export const Landing = () => (
    <StatusMessage
        icon={<DataHistogram24Regular />}
        i18nHeading='PowerBI_Viewer_Landing_Heading'
        i18nBody='PowerBI_Viewer_Landing_Body'
    />
);
