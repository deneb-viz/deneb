import { useMemo } from 'react';
import {
    Button,
    makeStyles,
    MessageBar,
    MessageBarActions,
    MessageBarBody,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    Text,
    Tooltip
} from '@fluentui/react-components';
import { ArrowUpExclamationRegular } from '@fluentui/react-icons';
import Editor from '@monaco-editor/react';

import { logRender } from '@deneb-viz/utils/logging';
import { EDITOR_DEFAULTS } from '@deneb-viz/configuration';
import { POPOVER_Z_INDEX } from '../../../lib';
import { useDenebState } from '../../../state';
import { stripSchemaFromSpec } from '../../../lib/spec-utils';
import { buildEditorProps } from '../../../components/code-editor/editor-configuration';

const useCompiledVegaPaneStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
    },
    messageBar: {
        borderLeft: 'none',
        borderRight: 'none'
    },
    editor: {
        flex: '1 1 auto',
        overflow: 'hidden'
    },
    popoverSurface: {
        zIndex: POPOVER_Z_INDEX
    },
    popoverContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '280px'
    }
});

type CompiledVegaPaneProps = {
    tooltipMountNode?: HTMLElement | null;
};

export const CompiledVegaPane = ({
    tooltipMountNode
}: CompiledVegaPaneProps) => {
    const {
        clearCompilation,
        config,
        fontSize,
        setContent,
        setProvider,
        theme,
        toggleCompiledVegaPane,
        translate,
        vgSpec
    } = useDenebState((state) => ({
        clearCompilation: state.compilation.clear,
        config: state.project.config,
        fontSize: state.editorPreferences.jsonEditorFontSize,
        setContent: state.project.setContent,
        setProvider: state.project.setProvider,
        theme: state.editorPreferences.theme,
        toggleCompiledVegaPane: state.editor.toggleCompiledVegaPane,
        translate: state.i18n.translate,
        vgSpec: state.compilation.result?.parsed.vgSpec
    }));
    const classes = useCompiledVegaPaneStyles();

    const strippedSpec = useMemo(
        () =>
            vgSpec
                ? stripSchemaFromSpec(vgSpec as Record<string, unknown>)
                : null,
        [vgSpec]
    );

    const formattedSpec = useMemo(() => {
        if (!strippedSpec) return '';
        return JSON.stringify(strippedSpec, null, EDITOR_DEFAULTS.tabSize);
    }, [strippedSpec]);

    const handleSwitchToVega = () => {
        if (!formattedSpec) return;
        toggleCompiledVegaPane();
        clearCompilation();
        setProvider('vega');
        setContent({ spec: formattedSpec, config });
    };

    logRender('CompiledVegaPane');
    return (
        <div className={classes.root}>
            <MessageBar shape='square' className={classes.messageBar}>
                <MessageBarBody>
                    {translate('Text_Compiled_Vega_Description')}
                </MessageBarBody>
                <MessageBarActions>
                    <Popover withArrow>
                        <Tooltip
                            relationship='description'
                            content={translate('Tooltip_Compiled_Vega_Switch')}
                            withArrow
                            mountNode={tooltipMountNode}
                        >
                            <PopoverTrigger>
                                <Button
                                    size='small'
                                    icon={<ArrowUpExclamationRegular />}
                                    disabled={!formattedSpec}
                                >
                                    {translate('Text_Compiled_Vega_Switch')}
                                </Button>
                            </PopoverTrigger>
                        </Tooltip>
                        <PopoverSurface className={classes.popoverSurface}>
                            <div className={classes.popoverContent}>
                                <Text size={200}>
                                    {translate(
                                        'Text_Compiled_Vega_Switch_Confirm'
                                    )}
                                </Text>
                                <Button
                                    appearance='primary'
                                    size='small'
                                    icon={<ArrowUpExclamationRegular />}
                                    onClick={handleSwitchToVega}
                                >
                                    {translate('Text_Compiled_Vega_Switch')}
                                </Button>
                            </div>
                        </PopoverSurface>
                    </Popover>
                </MessageBarActions>
            </MessageBar>
            <div className={classes.editor}>
                <Editor
                    {...buildEditorProps({
                        theme,
                        fontSize,
                        readOnly: true
                    })}
                    value={formattedSpec}
                />
            </div>
        </div>
    );
};
