import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode
} from 'react';
import { POPOVER_Z_INDEX } from '../lib/interface';

type CursorData = {
    lineNumber: number;
    column: number;
    selectedText: string;
};

type CursorContextValue = {
    cursor: CursorData;
    setCursor: (data: CursorData) => void;
    tooltipMountNode: HTMLDivElement | null;
};

const DEFAULT_CURSOR: CursorData = {
    lineNumber: 1,
    column: 1,
    selectedText: ''
};

const CursorContext = createContext<CursorContextValue>({
    cursor: DEFAULT_CURSOR,
    setCursor: () => {},
    tooltipMountNode: null
});

/**
 * Provider component for cursor context, tracking line number, column, and selected text in the editor.
 * Also provides a shared tooltip mount node at the editor area level, outside overflow-hidden Allotment panes.
 */
export const CursorProvider = ({ children }: { children: ReactNode }) => {
    const [cursor, setCursor] = useState<CursorData>(DEFAULT_CURSOR);
    const [tooltipMountNode, setTooltipMountNode] =
        useState<HTMLDivElement | null>(null);
    const value = useMemo(
        () => ({ cursor, setCursor, tooltipMountNode }),
        [cursor, tooltipMountNode]
    );
    return (
        <CursorContext.Provider value={value}>
            {children}
            <div
                ref={setTooltipMountNode}
                style={{ position: 'relative', zIndex: POPOVER_Z_INDEX }}
            />
        </CursorContext.Provider>
    );
};

export const useCursorContext = () => useContext(CursorContext);
