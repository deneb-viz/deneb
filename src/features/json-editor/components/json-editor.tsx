import React, { useEffect, useMemo, useState } from 'react';
import { render } from 'react-dom';
import { shallow } from 'zustand/shallow';
import { IAceEditor, ICommand } from 'react-ace/lib/types';
import debounce from 'lodash/debounce';
import { useUncontrolledFocus } from '@fluentui/react-components';

import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Point = Ace.Point;
import langTools from 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/ext-searchbox';
import AceEditor from 'react-ace';

import '../theme/theme-deneb-dark';
import '../theme/theme-deneb-light';

import { TEditorRole } from '../types';
import store, { getState } from '../../../store';
import { logDebug } from '../../logging';
import { customCompleter } from '../completion';
import { getEditorFolds, toggleEditorFolds } from '../folding';
import { useJsonEditorContext } from './json-editor-context-provider';
import {
    PORTAL_ROOT_ID,
    PREVIEW_PANE_TOOLBAR_BUTTON_PADDING,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../../constants';
import { TokenTooltip } from './token-tooltip';
import { getHoverResult } from '../hover';
import {
    shouldPrioritizeJsonEditor,
    useInterfaceStyles
} from '../../interface';
import { JsonEditorStatusBar } from './json-editor-status-bar';
import { validateEditorJson } from '../validation';
import { persistSpecification } from '../../specification';
import {
    JsonContentType,
    PROPERTIES_DEFAULTS,
    SpecProvider
} from '@deneb-viz/core-dependencies';

interface IJsonEditorProps {
    thisEditorRole: TEditorRole;
}

/**
 * Handles everything we need to manage for the status bar.
 */
interface IJsonEditorStatusState {
    cursorPosition: Point;
    role: TEditorRole;
    selectedText: string;
}

const MOUSEMOVE_DEBOUNCE = 200;

/**
 * Represents an instance of Ace editor, responsible for maintaining either
 * the JSON spec or the config for a Vega/Vega-Lite visualization.
 *
 * @privateRemarks
 * The useEffect hook is to handle situations where updating the editor text
 * (e.g., via create or format) does not refresh the component until a key is
 * pressed, or the editor is manually interacted with. We also do a
 * preventative validation to ensure that there are no artefacts from changing
 * schemas without recording a change to text.
 *
 * We can't use annotations and markers directly in the AceEditor component, as
 * they seem to depend on the worker being present, and its logic. Whilst it is
 * _possible_ to load this worker using a Blob URL, its logic overrides our
 * custom validation and as such, we'll take the hit.
 */
//eslint-disable-next-line max-lines-per-function
export const JsonEditor: React.FC<IJsonEditorProps> = ({ thisEditorRole }) => {
    const {
        applyMode,
        current,
        fields,
        foldsConfig,
        foldsSpec,
        fontSize,
        hasErrors,
        localCompletion,
        provider,
        showGutter,
        showLineNumbers,
        theme,
        wordWrap,
        setFolds,
        setHasErrors,
        updateChanges
    } = store(
        (state) => ({
            applyMode: state.editor.applyMode,
            current: state.editorSelectedOperation,
            fields: state.dataset.fields,
            foldsConfig: state.editor.foldsConfig,
            foldsSpec: state.editor.foldsSpec,
            fontSize: state.visualSettings.editor.json.fontSize.value,
            hasErrors: state.editor.hasErrors,
            localCompletion:
                state.visualSettings.editor.completion.localCompletion.value,
            provider: state.visualSettings.vega.output.provider
                .value as SpecProvider,
            showGutter: state.visualSettings.editor.json.showGutter.value,
            showLineNumbers:
                state.visualSettings.editor.json.showLineNumbers.value,
            theme: state.visualSettings.editor.interface.theme.value,
            wordWrap: state.visualSettings.editor.json.wordWrap.value,
            setFolds: state.editor.setFolds,
            setHasErrors: state.editor.setHasErrors,
            updateChanges: state.editor.updateChanges
        }),
        shallow
    );
    const attr = useUncontrolledFocus();
    const classes = useInterfaceStyles();
    const editorHeight = useMemo(
        () =>
            `calc(100% - ${
                PREVIEW_PANE_TOOLBAR_MIN_SIZE +
                PREVIEW_PANE_TOOLBAR_BUTTON_PADDING
            }px)`,
        []
    );
    const isActiveEditor = useMemo(() => current === thisEditorRole, [current]);
    const display = useMemo(
        () => (isActiveEditor ? 'inline' : 'none'),
        [isActiveEditor]
    );
    const { spec, config } = useJsonEditorContext();
    const ref = thisEditorRole === 'Spec' ? spec : config;
    const [editorText, setEditorText] = useState(
        ref?.current?.editor?.getValue()
    );
    const [escapeHatch, setEscapeHatch] = useState(false);
    const [status, setStatus] = useState<IJsonEditorStatusState>({
        cursorPosition: getResolvedCursorPoint(),
        role: thisEditorRole,
        selectedText: ''
    });
    useEffect(() => {
        langTools.setCompleters([
            customCompleter(fields, provider, current, localCompletion)
        ]);
    }, [fields, provider, current, localCompletion]);
    const onChangeEditor = (value: string) => {
        logDebug('onChangeEditor');
        clearTokenTooltip();
        setEditorText(() => value);
        logDebug('Staging editor value', thisEditorRole);
        const editor = ref?.current?.editor;
        const folds = getEditorFolds(editor);
        updateChanges({ role: thisEditorRole, text: value, folds });
        if (applyMode === 'Auto') {
            logDebug('Auto-apply changes');
            persistSpecification(spec.current.editor, config.current.editor);
        }
    };
    const onCursorChange = (value: any, event?: any) => {
        logDebug('onCursorChange', value, event);
        clearTokenTooltip();
        const point: Ace.Point = getResolvedCursorPoint(value);
        setStatus({
            ...status,
            cursorPosition: point,
            selectedText: ref?.current?.editor?.getSelectedText() || ''
        });
    };
    const onLoadEditor = (editor: Ace.Editor) => {
        logDebug('onLoadEditor', thisEditorRole);
        const text = editor.getValue();
        setEditorText(() => text);
        updateChanges({
            role: thisEditorRole,
            text,
            folds: getEditorFolds(editor as IAceEditor)
        });
        const points =
            thisEditorRole === 'Spec' ? foldsSpec : foldsConfig || [];
        toggleEditorFolds(
            editor,
            points.map((p) => p.point)
        );
        editor.moveCursorToPosition(status.cursorPosition);
        editor.scrollToLine(status.cursorPosition.row, true, true, () => null);
        editor.on(
            'mousemove',
            debounce(
                (e) => onMouseMove(e, provider, current),
                MOUSEMOVE_DEBOUNCE
            )
        );
        editor.on('focus', () => {
            setEditorTabBehavior(editor);
            setEscapeHatch(false);
        });
        editor.session.on('changeFold', () => {
            setFolds({
                role: thisEditorRole,
                folds: getEditorFolds(editor as IAceEditor)
            });
        });
    };
    const commands: ICommand[] = useMemo(
        () => [
            {
                name: 'escape-hatch',
                bindKey: { win: 'Ctrl-M', mac: 'Command-M' },
                exec: (editor) => {
                    clearTokenTooltip();
                    setEscapeHatch((prevState) => {
                        setCommandEnabled(editor, 'indent', prevState);
                        setCommandEnabled(editor, 'outdent', prevState);
                        return !prevState;
                    });
                }
            }
        ],
        []
    );
    const editorTheme = `deneb-${theme}`;
    // Handle validation - refer to privateRemarks above.
    useEffect(
        () =>
            validateEditorJson(
                ref?.current?.editor,
                provider,
                current as JsonContentType,
                editorText,
                hasErrors,
                setHasErrors
            ),
        [editorText, provider, current]
    );
    // Ensure that focus is applied if we change the editor role.
    useEffect(() => {
        if (isActiveEditor) {
            ref?.current?.editor?.focus();
        }
    }, [provider, current]);
    return (
        <div style={{ display }} className={classes.editorContainer} {...attr}>
            <AceEditor
                width={'100%'}
                height={editorHeight}
                ref={ref}
                mode='json'
                theme={editorTheme}
                name={`editor${thisEditorRole}`}
                editorProps={{ $blockScrolling: true }}
                setOptions={{
                    useWorker: false,
                    useSvgGutterIcons: false,
                    showLineNumbers
                }}
                debounceChangePeriod={
                    PROPERTIES_DEFAULTS.editor.debounceInterval
                }
                defaultValue={getDefaultValue(thisEditorRole)}
                onCursorChange={onCursorChange}
                onLoad={onLoadEditor}
                onChange={onChangeEditor}
                focus
                commands={commands}
                cursorStart={0}
                fontSize={`${fontSize}pt`}
                enableBasicAutocompletion
                enableLiveAutocompletion
                wrapEnabled={wordWrap}
                showPrintMargin={false}
                showGutter={showGutter}
                tabSize={PROPERTIES_DEFAULTS.editor.tabSize}
            />
            <JsonEditorStatusBar
                clearTokenTooltip={clearTokenTooltip}
                position={status.cursorPosition}
                selectedText={status.selectedText}
                escapeHatch={escapeHatch}
            />
        </div>
    );
};

/**
 * We need to clear the token tooltip in loads of events, so this ensures that
 * the portal is cleared down.
 */
const clearTokenTooltip = () =>
    render(null, document.getElementById(PORTAL_ROOT_ID));

/**
 * Resolve the default value when instantiated, either from settings or staging
 * as needed.
 */
const getDefaultValue = (role: TEditorRole) => {
    const {
        editor: { stagedConfig, stagedSpec },
        visualSettings
    } = getState();
    switch (role) {
        case 'Spec':
            return stagedSpec ?? visualSettings.vega.output.jsonSpec.value;
        case 'Config':
            return stagedConfig ?? visualSettings.vega.output.jsonConfig.value;
    }
};

/**
 * Common method to handle getting correct cursor position for the status bar
 * and state within the `JsonEditor` component.
 */
const getResolvedCursorPoint = (value?: any) => ({
    row: value?.cursor?.row || 0,
    column: value?.cursor?.column || 0
});

/**
 * Resolve hover events for the editor, and update the portal content as
 * needed.
 */
const onMouseMove = (
    e: any,
    provider: SpecProvider,
    currentEditor: TEditorRole
) => {
    logDebug('onMouseMove', e, provider, currentEditor);
    clearTokenTooltip();
    if (shouldPrioritizeJsonEditor()) {
        getHoverResult(e, provider, currentEditor).then((result) => {
            logDebug('onMouseMove - result', result);
            const markdown = result?.hoverResult?.contents?.toString();
            logDebug('onMouseMove - markdown', markdown);
            if (markdown) {
                render(
                    <TokenTooltip event={e} markdown={markdown} />,
                    document.getElementById('portal-root')
                );
            } else {
                logDebug('onMouseMove - clearing token tooltip');
                clearTokenTooltip();
            }
        });
    }
};

/**
 * Provides a means to enable/disable commands against Ace Editor.
 * Taken from this handy SO answer: https://stackoverflow.com/a/24963811
 */
const setCommandEnabled = (
    editor: Ace.Editor,
    name: string,
    enabled: boolean
) => {
    const command = editor.commands.byName[name];
    const bindKeyOriginal = 'bindKeyOriginal';
    if (!command[bindKeyOriginal]) command[bindKeyOriginal] = command.bindKey;
    command.bindKey = enabled ? command[bindKeyOriginal] : null;
    editor.commands.addCommand(command);
    /**
     * special case for backspace and delete which will be called from
     * textarea if not handled by main command binding
     */
    if (!enabled) {
        let key = command[bindKeyOriginal];
        if (key && typeof key == 'object')
            key = key[editor.commands['platform']];
        if (/backspace|delete/i.test(key)) editor.commands.bindKey(key, null);
    }
};

/**
 * Ensure that indent/outdent is (re)enabled when editor gets focus.
 */
const setEditorTabBehavior = (editor: Ace.Editor) => {
    setCommandEnabled(editor, 'indent', true);
    setCommandEnabled(editor, 'outdent', true);
};
