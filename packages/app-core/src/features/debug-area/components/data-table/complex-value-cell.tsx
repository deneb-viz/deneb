import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    makeStyles,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    tokens,
    Tooltip
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import Editor from '@monaco-editor/react';

import { formatJson } from '@deneb-viz/utils/object';
import { POPOVER_Z_INDEX } from '../../../../lib';
import { getDenebState, useDenebState } from '../../../../state';
import { buildEditorProps } from '../../../../components/code-editor/editor-configuration';
import { useDataTableTooltip } from './data-table-tooltip-context';

const useComplexValueCellStyles = makeStyles({
    popoverSurface: {
        zIndex: POPOVER_Z_INDEX
    },
    editorContainer: {
        width: '450px',
        height: '350px',
        border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`
    }
});

type ComplexValueCellProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawValue: any;
};

export const ComplexValueCell = ({ rawValue }: ComplexValueCellProps) => {
    const classes = useComplexValueCellStyles();
    const { translate } = getDenebState().i18n;
    const { fontSize, theme } = useDenebState((state) => ({
        fontSize: state.editorPreferences.jsonEditorFontSize,
        theme: state.editorPreferences.theme
    }));
    const tooltipMountNode = useDataTableTooltip();
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const formattedValue = useMemo(() => {
        if (rawValue == null) return '';
        try {
            return formatJson(rawValue) ?? '';
        } catch {
            return '';
        }
    }, [rawValue]);

    const handleOpenChange = useCallback(
        (_e: unknown, data: { open: boolean }) => {
            setPopoverOpen(data.open);
        },
        []
    );

    // Dismiss popover on any ancestor scroll, but ignore scrolling
    // within the popover's Monaco editor.
    useEffect(() => {
        if (!popoverOpen) return;
        const dismiss = (e: Event) => {
            if (editorContainerRef.current?.contains(e.target as Node)) return;
            setPopoverOpen(false);
        };
        window.addEventListener('scroll', dismiss, true);
        return () => window.removeEventListener('scroll', dismiss, true);
    }, [popoverOpen]);

    return (
        <Popover open={popoverOpen} onOpenChange={handleOpenChange} withArrow>
            <Tooltip
                content={translate('Table_Tooltip_TooLong')}
                relationship='description'
                withArrow
                mountNode={tooltipMountNode}
            >
                <PopoverTrigger>
                    <Button
                        appearance='subtle'
                        size='small'
                        icon={<MoreHorizontalRegular />}
                    />
                </PopoverTrigger>
            </Tooltip>
            <PopoverSurface className={classes.popoverSurface}>
                <div
                    ref={editorContainerRef}
                    className={classes.editorContainer}
                >
                    <Editor
                        {...buildEditorProps({
                            theme,
                            fontSize,
                            readOnly: true,
                            showLineNumbers: false,
                            wordWrap: false
                        })}
                        value={formattedValue}
                    />
                </div>
            </PopoverSurface>
        </Popover>
    );
};
