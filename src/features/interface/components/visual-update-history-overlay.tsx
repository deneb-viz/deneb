import React from 'react';
import { shallow } from 'zustand/shallow';
import store from '../../../store';
import { FEATURES } from '../../../../config';

/**
 * Provides a simple textarea that we can view the visual update history from
 * the store. Is intended for debugging status changes based on the update
 * options from the Power BI visual host.
 */
export const VisualUpdateHistoryOverlay: React.FC = () => {
    const { history } = store(
        (state) => ({
            history: state.visualUpdateOptions.history
        }),
        shallow
    );
    return FEATURES.visual_update_history_overlay ? (
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
