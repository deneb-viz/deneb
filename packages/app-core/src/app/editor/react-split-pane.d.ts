// This is a shim for React 19's new JSX transform support for SplitPane (which is very old)
// TODO: replace SplitPane with a newer library
declare module 'react-split-pane' {
    import * as React from 'react';

    export type SplitPaneProps = React.PropsWithChildren<{
        split?: 'vertical' | 'horizontal';
        minSize?: number;
        maxSize?: number;
        size?: number;
        defaultSize?: number;
        allowResize?: boolean;
        onChange?: (size: number) => void;
        onResizerDoubleClick?: (event: MouseEvent) => void;
        resizerStyle?: React.CSSProperties;
        paneStyle?: React.CSSProperties;
        style?: React.CSSProperties;
        className?: string;
    }>;

    const SplitPane: React.FC<SplitPaneProps>;
    export default SplitPane;
}
