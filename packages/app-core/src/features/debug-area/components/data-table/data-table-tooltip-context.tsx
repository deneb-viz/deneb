import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { TooltipCustomMount } from '../../../../components/ui';

type DataTableTooltipContextValue = {
    mountNode: HTMLElement | null;
};

const DataTableTooltipContext =
    createContext<DataTableTooltipContextValue | null>(null);

export const useDataTableTooltip = () => {
    const ctx = useContext(DataTableTooltipContext);
    return ctx?.mountNode ?? null;
};

export const DataTableTooltipProvider = ({
    children
}: {
    children: ReactNode;
}) => {
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
    const contextValue = useMemo(() => ({ mountNode }), [mountNode]);
    return (
        <DataTableTooltipContext.Provider value={contextValue}>
            {children}
            <TooltipCustomMount setRef={setMountNode} />
        </DataTableTooltipContext.Provider>
    );
};
