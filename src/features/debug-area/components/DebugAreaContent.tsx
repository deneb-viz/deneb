import React, { CSSProperties } from 'react';

import { Stack, IStackTokens, IStackStyles } from '@fluentui/react/lib/Stack';
import { Scrollbars } from 'react-custom-scrollbars-2';

import store from '../../../store';
import LogViewer from './LogViewer';
import { DataViewerRouter } from './DataViewerRouter';
import { SignalViewerRouter } from './SignalViewerRouter';
import { reactLog } from '../../../core/utils/reactLog';
import { Paragraph } from '../../../components/elements/Typography';
import { i18nValue } from '../../../core/ui/i18n';

const areaContainerStyle: CSSProperties = { height: '100%' };

const verticalStackTokens: IStackTokens = {
    childrenGap: 5,
    padding: 10
};

const stackStyles: IStackStyles = {
    root: {
        height: '100%',
        maxHeight: '100%'
    }
};

export const DebugAreaContent: React.FC = () => {
    const { editorPreviewAreaSelectedPivot } = store((state) => state);
    const resolvePane = () => {
        switch (editorPreviewAreaSelectedPivot) {
            case 'log':
                return <LogViewer />;
            case 'data':
                return <DataViewerRouter />;
            case 'signal':
                return <SignalViewerRouter />;
            default:
                return <Paragraph>{i18nValue('Pivot_Mode_Unknown')}</Paragraph>;
        }
    };
    reactLog('Rendering [DebugAreaContent]');
    return (
        <div style={areaContainerStyle}>
            <Scrollbars>
                <Stack tokens={verticalStackTokens} styles={stackStyles}>
                    {resolvePane()}
                </Stack>
            </Scrollbars>
        </div>
    );
};
