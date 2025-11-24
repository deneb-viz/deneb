import { useMemo, useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
    ArrowNext12Regular,
    ArrowPrevious12Regular,
    ChevronLeft12Regular,
    ChevronRight12Regular
} from '@fluentui/react-icons';

import { TooltipCustomMount } from '@deneb-viz/app-core';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

/**
 * Specifies navigation operations on the data table. We can use this as a property in a generic component to handle
 * repetitive code.
 */
type DataTableNavigationType = 'first' | 'last' | 'next' | 'previous';

type DataTableNavigationButtonProps = {
    disabled: boolean;
    type: DataTableNavigationType;
    onClick: () => void;
};

export const DataTableNavigationButton = ({
    disabled,
    type,
    onClick
}: DataTableNavigationButtonProps) => {
    const [ref, setRef] = useState<HTMLElement | null>();
    const icon = useMemo(() => getNavigationIcon(type), [type]);
    const i18nKey = useMemo(() => getI18nValue(getI18nKey(type)), [type]);
    return (
        <div>
            <Tooltip
                content={i18nKey}
                relationship='label'
                withArrow
                mountNode={ref}
            >
                <Button
                    appearance='subtle'
                    disabled={disabled}
                    icon={icon}
                    onClick={onClick}
                />
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </div>
    );
};

export const getNavigationIcon = (type: DataTableNavigationType) => {
    switch (type) {
        case 'first':
            return <ArrowPrevious12Regular />;
        case 'previous':
            return <ChevronLeft12Regular />;
        case 'next':
            return <ChevronRight12Regular />;
        case 'last':
            return <ArrowNext12Regular />;
    }
};

export const getI18nKey = (type: DataTableNavigationType) => {
    switch (type) {
        case 'first':
            return 'Text_Data_Table_Navigation_First';
        case 'previous':
            return 'Text_Data_Table_Navigation_Previous';
        case 'next':
            return 'Text_Data_Table_Navigation_Next';
        case 'last':
            return 'Text_Data_Table_Navigation_Last';
    }
};
