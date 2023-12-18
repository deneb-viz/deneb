import { getJsonLanguageService, getJsonTextDocument } from '.';
import { getProviderSchema } from '../specification';
import { TSpecProvider } from '../../core/vega';
import { TEditorRole } from '../json-editor';

/**
 * Perform language validation against the supplied JSON content and get the
 * details of any validation errors.
 */
export const getJsonDocumentValidation = (
    provider: TSpecProvider,
    editorRole: TEditorRole,
    content: string
) => {
    const textDocument = getJsonTextDocument(content);
    const languageService = getJsonLanguageService(
        getProviderSchema({ provider, isConfig: editorRole === 'Config' })
    );
    const jsonDocument = languageService.parseJSONDocument(textDocument);
    return languageService.doValidation(textDocument, jsonDocument, {
        comments: 'ignore'
    });
};
