import { makeStyles, tokens } from '@fluentui/react-components';

import { useDenebState } from '../../../state';
import { DatasetSelect } from './dataset-viewer/dataset-select';
import { StatusBarContainer } from '../../../components/ui';
import { useDebugWrapperStyles } from './styles';
import type { EmptyStateReason } from './empty-state-reason';
import {
    getMessageKey,
    shouldEmbedDatasetSelect
} from './no-data-message-utils';

const useNoDataMessageStyles = makeStyles({
    dataTableNoDataMessage: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        flexShrink: 1000,
        margin: tokens.spacingVerticalXS,
        overflow: 'auto'
    }
});

export type NoDataMessageProps = {
    reason: EmptyStateReason;
};

/**
 * Displays when no data is available in the data table. Callers pass the
 * `reason` explicitly so the rendered copy matches the actual cause.
 */
export const NoDataMessage = ({ reason }: NoDataMessageProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useNoDataMessageStyles();
    const wrapperClasses = useDebugWrapperStyles();
    const message = translate(getMessageKey(reason));
    const options = shouldEmbedDatasetSelect(reason) ? <DatasetSelect /> : null;
    return (
        <div className={wrapperClasses.container}>
            <div className={wrapperClasses.wrapper}>
                <div className={wrapperClasses.details}>
                    <div className={classes.dataTableNoDataMessage}>
                        {message}
                    </div>
                    <StatusBarContainer nearItems={options} />
                </div>
            </div>
        </div>
    );
};
