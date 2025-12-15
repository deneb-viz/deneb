import { toBoolean } from '@deneb-viz/utils/type-conversion';
import { useDenebState } from '@deneb-viz/app-core';

const IS_OVERLAY_ENABLED = toBoolean(process.env.PBIVIZ_DEV_OVERLAY);

/**
 * Provides a simple textarea that we can view the visual update history from
 * the store. Is intended for debugging status changes based on the update
 * options from the Power BI visual host.
 */
export const VisualUpdateHistoryOverlay = () => {
    const history = useDenebState((state) => state.visualUpdateOptions.history);
    return IS_OVERLAY_ENABLED ? (
        <textarea
            style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '20px',
                height: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                zIndex: 9999,
                display: 'block'
            }}
            value={JSON.stringify(history, null, 2)}
        />
    ) : (
        <></>
    );
};
