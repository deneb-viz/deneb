import React, { CSSProperties, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Portal, Themes } from '../../interface';

import { getVisualHost } from '../../visual-host';
import {
    FluentProvider,
    makeStyles,
    shorthands,
    tokens
} from '@fluentui/react-components';
import store from '../../../store';
import { shallow } from 'zustand/shallow';

interface ITokenTooltipProps {
    event: any;
    markdown: string;
}

const TOOLTIP_ID = 'deneb-token-tooltip';

const TOOLTIP_OFFSET_PX = 15;

const TOOLTIP_HORIZONTAL_CAP = 450;

const TOOLTIP_VERTICAL_CAP = 250;

const useTooltipStyles = makeStyles({
    container: {
        position: 'absolute',
        pointerEvents: 'auto',
        backgroundColor: tokens.colorNeutralBackground1,
        whiteSpace: 'unset',
        maxWidth: '450px',
        maxHeight: '250px',
        overflowY: 'auto',
        zIndex: 10000000,
        ...shorthands.padding(
            tokens.spacingVerticalXS,
            tokens.spacingHorizontalXS
        ),
        ...shorthands.border(
            tokens.strokeWidthThin,
            'solid',
            tokens.colorNeutralStroke2
        ),
        '& p': {
            ...shorthands.margin(tokens.spacingVerticalNone)
        }
    }
});

/**
 * Render an Ace tooltip inside the portal, with the supplied markdown.
 */
export const TokenTooltip: React.FC<ITokenTooltipProps> = ({
    event,
    markdown
}) => {
    const classes = useTooltipStyles();
    const [visible, setVisible] = React.useState(true);
    const handleDismiss = () => {
        setVisible(false);
    };
    const handleMouseover = () => setVisible(true);
    const { theme } = store(
        (state) => ({ theme: state.visualSettings.editor.theme }),
        shallow
    );
    const positionStyles: CSSProperties = {
        margin: `${TOOLTIP_OFFSET_PX}px`,
        left: event?.clientX - TOOLTIP_OFFSET_PX,
        maxWidth: TOOLTIP_HORIZONTAL_CAP,
        maxHeight: TOOLTIP_VERTICAL_CAP
    };
    if (event?.clientY < TOOLTIP_VERTICAL_CAP) {
        positionStyles.top = event.clientY - TOOLTIP_OFFSET_PX;
    } else {
        positionStyles.bottom = `calc(100% - ${
            event.clientY + TOOLTIP_OFFSET_PX
        }px)`;
    }
    useEffect(() => {
        setVisible(true);
    }, [event]);
    return visible ? (
        <Portal>
            <FluentProvider theme={Themes[theme]}>
                <div
                    id={TOOLTIP_ID}
                    className={classes.container}
                    style={positionStyles}
                    onMouseLeave={handleDismiss}
                    onMouseOver={handleMouseover}
                    onKeyDown={handleDismiss}
                    role='tooltip'
                >
                    <Markdown
                        components={{
                            a: ({ ...props }) => (
                                <a
                                    role='hyperlink'
                                    href=''
                                    onClick={processMarkdownLinks}
                                    {...props}
                                />
                            )
                        }}
                    >
                        {markdown}
                    </Markdown>
                </div>
            </FluentProvider>
        </Portal>
    ) : null;
};

/**
 * Process any hyperlinks to use the `launchUrl` API.
 */
const processMarkdownLinks = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
) => {
    event.preventDefault();
    getVisualHost().launchUrl(event?.currentTarget?.href);
};
