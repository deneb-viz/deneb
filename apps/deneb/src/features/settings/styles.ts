import { makeStyles } from '@fluentui/react-components';
import { spinButtonStyleSlots } from '@deneb-viz/app-core';

export const useSettingsStyles = makeStyles({
    radioGroupLabel: {
        userSelect: 'none',
        msUserSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none'
    },
    sectionItem: {
        display: 'flex'
    },
    ...spinButtonStyleSlots
});
