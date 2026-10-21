import { type ReactElement } from 'react';
import { Body1, Subtitle2 } from '@fluentui/react-components';

import { StatusContainer } from '@deneb-viz/powerbi-host';
import { useDenebState } from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';

type StatusMessageProps = {
    icon: ReactElement;
    i18nHeading: string;
    i18nBody: string;
};

/**
 * A single centred status message: an icon, a heading and one line of body
 * text, all translated.
 */
export const StatusMessage = ({
    icon,
    i18nHeading,
    i18nBody
}: StatusMessageProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    logRender('StatusMessage', i18nHeading);
    return (
        <StatusContainer>
            {icon}
            <Subtitle2 as='h1'>{translate(i18nHeading)}</Subtitle2>
            <Body1>{translate(i18nBody)}</Body1>
        </StatusContainer>
    );
};
