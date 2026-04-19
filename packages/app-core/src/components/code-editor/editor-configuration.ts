import { ptToPx } from '@deneb-viz/utils/dom';
import { EDITOR_DEFAULTS } from '@deneb-viz/configuration';

type EditorOptionsOverrides = {
    fontSize: number;
    readOnly?: boolean;
    wordWrap?: boolean;
    showLineNumbers?: boolean;
    quickSuggestions?: boolean;
    fixedOverflowWidgets?: boolean;
};

const buildEditorOptions = ({
    fontSize,
    readOnly,
    wordWrap,
    showLineNumbers,
    quickSuggestions,
    fixedOverflowWidgets
}: EditorOptionsOverrides) => ({
    cursorBlinking: 'smooth' as const,
    folding: true,
    fontSize: ptToPx(fontSize),
    lineNumbers: (showLineNumbers === false ? 'off' : 'on') as 'on' | 'off',
    lineNumbersMinChars: 2,
    minimap: { enabled: false },
    readOnly: readOnly ?? false,
    scrollBeyondLastLine: false,
    tabSize: EDITOR_DEFAULTS.tabSize,
    wordWrap: (wordWrap === false ? 'off' : 'on') as 'on' | 'off',
    ...(quickSuggestions !== undefined && { quickSuggestions }),
    ...(fixedOverflowWidgets !== undefined && { fixedOverflowWidgets })
});

type EditorPropsOverrides = EditorOptionsOverrides & {
    theme: string;
    language?: 'json' | 'plaintext';
};

/**
 * As our usage of the Monaco Editor grows, we want to ensure a consistent configuration across all instances. This function serves as a
 * single place to define common props and options for our editors, while still allowing for overrides where necessary.
 *
 * The `language` override is used when the editor displays content that is not
 * JSON (e.g. a bare string or date literal in the cell inspector). When
 * omitted, the editor defaults to JSON to match the primary spec-editing use
 * case.
 */
export const buildEditorProps = ({
    theme,
    language,
    ...optionsOverrides
}: EditorPropsOverrides) => ({
    width: '100%' as const,
    height: '100%' as const,
    defaultLanguage: language ?? ('json' as const),
    theme: theme === 'dark' ? ('vs-dark' as const) : ('light' as const),
    options: buildEditorOptions(optionsOverrides)
});
