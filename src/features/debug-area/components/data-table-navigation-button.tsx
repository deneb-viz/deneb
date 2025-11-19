import React, { useMemo, useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import {
    ArrowNext12Regular,
    ArrowPrevious12Regular,
    ChevronLeft12Regular,
    ChevronRight12Regular
} from '@fluentui/react-icons';

import { DataTableNavigationType } from '../types';
import { getI18nValue } from '../../i18n';
import { TooltipCustomMount } from '../../interface';

interface IDataTableNavigationButtonProps {
    disabled: boolean;
    type: DataTableNavigationType;
    onClick: () => void;
}

export const DataTableNavigationButton: React.FC<
    IDataTableNavigationButtonProps
> = ({ disabled, type, onClick }) => {
    const [ref, setRef] = useState<HTMLElement | null>();
    const icon = useMemo(() => getNavigationIcon(type), [type]);
    const i18nKey = useMemo(() => getI18nValue(geti18nKey(type)), [type]);
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

export const geti18nKey = (type: DataTableNavigationType) => {
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
