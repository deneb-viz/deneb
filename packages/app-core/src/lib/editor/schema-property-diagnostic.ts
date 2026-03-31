import {
    parseTree,
    findNodeAtLocation,
    modify,
    applyEdits
} from 'jsonc-parser';
import { monaco } from '../../components/code-editor/monaco-integration';
import { getDenebState } from '../../state';

const DIAGNOSTIC_SOURCE = 'deneb';
const SCHEMA_DIAGNOSTIC_CODE = 'deneb.schema-property';

/**
 * Check the editor model for a root-level $schema property and set/clear
 * a warning marker accordingly. Call on mount and on content change.
 */
export const updateSchemaPropertyMarkers = (
    model: monaco.editor.ITextModel
): void => {
    const content = model.getValue();
    const tree = parseTree(content);
    if (!tree) {
        monaco.editor.setModelMarkers(model, SCHEMA_DIAGNOSTIC_CODE, []);
        return;
    }
    const schemaNode = findNodeAtLocation(tree, ['$schema']);
    if (!schemaNode) {
        monaco.editor.setModelMarkers(model, SCHEMA_DIAGNOSTIC_CODE, []);
        return;
    }
    // The schemaNode is the value node. Its parent is the property node
    // which includes the key. Use the parent's offset/length for the
    // full property range (key + colon + value).
    const propertyNode = schemaNode.parent;
    const node = propertyNode ?? schemaNode;
    const startPos = model.getPositionAt(node.offset);
    const endPos = model.getPositionAt(node.offset + node.length);
    const { translate } = getDenebState().i18n;
    monaco.editor.setModelMarkers(model, SCHEMA_DIAGNOSTIC_CODE, [
        {
            severity: monaco.MarkerSeverity.Warning,
            message: translate('Text_Diagnostic_SchemaProperty_Warning'),
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
            code: SCHEMA_DIAGNOSTIC_CODE,
            source: DIAGNOSTIC_SOURCE
        }
    ]);
};

let codeActionProviderRegistered = false;

/**
 * Register a CodeActionProvider for JSON models that offers a quick fix
 * to remove the $schema property. Safe to call multiple times — only
 * registers once.
 */
export const registerSchemaPropertyCodeActionProvider = (): void => {
    if (codeActionProviderRegistered) return;
    codeActionProviderRegistered = true;
    monaco.languages.registerCodeActionProvider('json', {
        provideCodeActions(model, _range, context) {
            const marker = context.markers.find(
                (m) => m.code === SCHEMA_DIAGNOSTIC_CODE
            );
            if (!marker) return { actions: [], dispose() {} };

            const content = model.getValue();
            const { tabSize, insertSpaces } = model.getOptions();
            const edits = modify(content, ['$schema'], undefined, {
                formattingOptions: { tabSize, insertSpaces }
            });
            const newContent = applyEdits(content, edits);

            const { translate } = getDenebState().i18n;
            const fullRange = model.getFullModelRange();
            const action: monaco.languages.CodeAction = {
                title: translate('Text_Diagnostic_SchemaProperty_QuickFix'),
                diagnostics: [marker],
                kind: 'quickfix',
                edit: {
                    edits: [
                        {
                            resource: model.uri,
                            textEdit: {
                                range: fullRange,
                                text: newContent
                            },
                            versionId: model.getVersionId()
                        }
                    ]
                },
                isPreferred: true
            };
            return { actions: [action], dispose() {} };
        }
    });
};
