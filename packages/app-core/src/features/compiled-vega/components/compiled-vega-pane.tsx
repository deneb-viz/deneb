import { useCallback, useMemo, useState } from 'react';
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

import type { TopLevelSpec } from 'vega-lite';

import { logRender } from '@deneb-viz/utils/logging';
import { formatJson } from '@deneb-viz/utils/object';
import {
    compileCleanVgSpec,
    parseJsonWithResult
} from '@deneb-viz/vega-runtime/spec-processing';
import { POPOVER_Z_INDEX } from '../../../lib';
import { useDenebState } from '../../../state';
import {
    stripConfigFromSpec,
    stripSchemaFromSpec
} from '../../../lib/spec-utils';
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
        configString,
        fontSize,
        isCompiledVegaPaneVisible,
        provider,
        resetViewStates,
        setContent,
        setProvider,
        specString,
        theme,
        toggleCompiledVegaPane,
        translate
    } = useDenebState((state) => ({
        clearCompilation: state.compilation.clear,
        configString: state.project.config,
        fontSize: state.editorPreferences.jsonEditorFontSize,
        isCompiledVegaPaneVisible: state.editor.isCompiledVegaPaneVisible,
        provider: state.project.provider,
        resetViewStates: state.editor.resetViewStates,
        setContent: state.project.setContent,
        setProvider: state.project.setProvider,
        specString: state.project.spec,
        theme: state.editorPreferences.theme,
        toggleCompiledVegaPane: state.editor.toggleCompiledVegaPane,
        translate: state.i18n.translate
    }));
    const classes = useCompiledVegaPaneStyles();

    const formattedSpec = useMemo(() => {
        if (provider !== 'vegaLite' || !isCompiledVegaPaneVisible) return '';
        const parsedSpec = parseJsonWithResult(specString);
        if (parsedSpec.errors.length > 0) return '';
        const parsedConfig = parseJsonWithResult(configString || '{}');
        if (parsedConfig.errors.length > 0) return '';
        const vgSpec = compileCleanVgSpec(
            parsedSpec.result as TopLevelSpec,
            parsedConfig.result
        );
        if (!vgSpec) return '';
        const stripped = stripConfigFromSpec(
            stripSchemaFromSpec(vgSpec as Record<string, unknown>)
        );
        return formatJson(stripped);
    }, [provider, isCompiledVegaPaneVisible, specString, configString]);

    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleSwitchToVega = useCallback(() => {
        if (!formattedSpec) return;
        setPopoverOpen(false);
        toggleCompiledVegaPane();
        clearCompilation();
        resetViewStates();
        setProvider('vega');
        setContent({ spec: formattedSpec, config: configString });
    }, [
        clearCompilation,
        configString,
        formattedSpec,
        resetViewStates,
        setContent,
        setProvider,
        toggleCompiledVegaPane
    ]);

    logRender('CompiledVegaPane');
    return (
        <div className={classes.root}>
            <MessageBar shape='square' className={classes.messageBar}>
                <MessageBarBody>
                    {translate('Text_Compiled_Vega_Description')}
                </MessageBarBody>
                <MessageBarActions>
                    <Popover
                        withArrow
                        open={popoverOpen}
                        onOpenChange={(_e, data) =>
                            setPopoverOpen(data.open)
                        }
                    >
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
