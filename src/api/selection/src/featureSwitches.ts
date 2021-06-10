import { isFeatureEnabled } from '../../features';

export const isContextMenuEnabled = isFeatureEnabled('selectionContextMenu');
export const isDataPointEnabled = isFeatureEnabled('selectionDataPoint');
