import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode
} from 'react';

import { TooltipCustomMount } from '@deneb-viz/app-core';

type SettingsPaneTooltipContextValue = {
    mountNode: HTMLElement | null;
};

const SettingsPaneTooltipContext =
    createContext<SettingsPaneTooltipContextValue | null>(null);

export const useSettingsPaneTooltip = () => {
    const ctx = useContext(SettingsPaneTooltipContext);
    return ctx?.mountNode ?? null;
};

export const SettingsPaneTooltipProvider = ({
    children
}: {
    children: ReactNode;
}) => {
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
    const contextValue = useMemo(() => ({ mountNode }), [mountNode]);
    return (
        <SettingsPaneTooltipContext.Provider value={contextValue}>
            {children}
            <TooltipCustomMount setRef={setMountNode} />
        </SettingsPaneTooltipContext.Provider>
    );
};
