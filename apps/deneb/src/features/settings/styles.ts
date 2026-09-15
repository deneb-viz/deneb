import { makeStyles } from '@fluentui/react-components';
import { spinButtonStyleSlots } from '@deneb-viz/editor';

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
