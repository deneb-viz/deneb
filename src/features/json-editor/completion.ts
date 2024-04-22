import map from 'lodash/map';

import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Completer = Ace.Completer;
import Completion = Ace.Completion;
import Point = Ace.Point;
import Range = ace.Range;

import { TextEdit } from 'vscode-json-languageservice';
import { IVisualDatasetField, IVisualDatasetFields } from '../../core/data';
import { TSpecProvider } from '../../core/vega';
import { TEditorRole } from '.';
import { logDebug } from '../logging';
import { getI18nValue } from '../i18n';
import { getEditorPointToPosition } from '../json-processing';
import {
    getJsonLanguageService,
    getJsonTextDocument,
    getProviderSchema
} from '@deneb-viz/json-processing';

/**
 * For local completions, represents the word and distance from the current
 * cursor position.
 */
interface IWordScore {
    [key: string]: number;
}

/**
 * Score to deduct from the base score for a field in the dataset.
 */
const LANGUAGE_KEYWORD_SCORE_DATASET = 1000;

/**
 * Score to deduct from the base score for an internally generated field in the
 * dataset, like drilldown, or highlight columns.
 */
const LANGUAGE_KEYWORD_SCORE_INTERNAL = 2000;

/**
 * Score to deduct from the base score for a Vega keyword.
 */
const LANGUAGE_KEYWORD_SCORE_VEGA = 10000;

/**
 * Base score to apply to language keywords when generating completions.
 */
const LANGUAGE_KEYWORD_SCORE_BASE = 100000;

/**
 * Used when calculating word distance for local completion items. Surfaced
 * from Ace.
 */
const SPLIT_REGEX = /[^a-zA-Z_0-9$\-\u00C0-\u1FFF\u2C00-\uD7FF\w]+/;

/**
 * Used to handle auto-completion within the editor, based on the JSON schema
 * and the current cursor position.
 */
export const customCompleter = (
    fields: IVisualDatasetFields,
    provider: TSpecProvider,
    editorRole: TEditorRole,
    useLocalCompletions: boolean
): Completer => {
    return {
        getCompletions: async (editor, session, pos, prefix, callback) => {
            logDebug('[customCompleter] Called completer', {
                editor,
                editorRole,
                session,
                pos,
                prefix
            });
            const suggestions: Completion[] = [
                ...(await getVegaCompletions(
                    editor,
                    pos,
                    provider,
                    editorRole
                )),
                ...getDatasetCompletions(fields),
                ...(useLocalCompletions
                    ? getLocalCompletions(session, pos)
                    : [])
            ];
            callback(null, suggestions);
        }
    };
};

/**
 * For supplied editor text and cursor position, return a list of completion
 * items from the schema.
 */
const getCompletionResults = async (
    text: string,
    point: Point,
    provider: TSpecProvider,
    editorRole: TEditorRole
) => {
    const textDocument = getJsonTextDocument(text);
    const jsonSchema = getProviderSchema({
        provider,
        isConfig: editorRole === 'Config'
    });
    const languageService = getJsonLanguageService(jsonSchema);
    const jsonDocument = languageService.parseJSONDocument(textDocument);
    const position = getEditorPointToPosition(point);
    return await languageService.doComplete(
        textDocument,
        position,
        jsonDocument
    );
};

/**
 * Add our dataset fields to the list of completions.
 */
const getDatasetCompletions = (
    fields: IVisualDatasetFields
): Ace.Completion[] => {
    return map(fields, (field) => ({
        caption: field.displayName,
        value: field.displayName,
        score: LANGUAGE_KEYWORD_SCORE_BASE - getSnippetFieldScoreOffset(field),
        meta: getSnippetFieldMetadata(field)
    }));
};

/**
 * Surfacing the logic from Ace editor to provide local completion items, as
 * it doesn't seem to be easy to get at through an API (or if it is, it's not
 * documented).
 *
 * @privateRemarks
 *
 * This will allow us an entry point to refine our own version of local
 * word completion, if needs be.
 */
const getLocalCompletions = (
    session: Ace.EditSession,
    pos: Ace.Point
): Ace.Completion[] => {
    const wordScore = getWordDistance(session, pos);
    const wordList = Object.keys(wordScore);
    return wordList.map((word) => ({
        caption: word,
        value: word,
        score: wordScore[word],
        meta: getI18nValue('Text_AutoComplete_Meta_Local')
    }));
};

/**
 * For any data-based completers, we need to score them accordingly, so that
 * they are correctly prioritised in the list of suggestions. The higher the
 * value returned, the more they will be de-prioritized (we assume that the
 * Vega language completions are highest-priority, followed by columns and
 * measures from the data view, and then the internal fields).
 */
const getSnippetFieldScoreOffset = (field: IVisualDatasetField) => {
    switch (true) {
        case field.isHighlightComponent:
            return LANGUAGE_KEYWORD_SCORE_INTERNAL;
        case field.isMeasure:
        case field.isColumn:
            return LANGUAGE_KEYWORD_SCORE_DATASET;
        default:
            return LANGUAGE_KEYWORD_SCORE_VEGA;
    }
};

/**
 * For any data-based completers in the editor, provide a qualifier denoting
 * whether it's a column, measure or something else.
 */
const getSnippetFieldMetadata = (field: IVisualDatasetField) => {
    switch (true) {
        case field.isHighlightComponent:
            return getI18nValue('Text_AutoComplete_Meta_Highlight');
        case field.isMeasure:
            return getI18nValue('Text_AutoComplete_Meta_Measure');
        case field.isColumn:
            return getI18nValue('Text_AutoComplete_Meta_Column');
        default:
            return '';
    }
};

/**
 * Use the VS code language service to provide auto-completion items against
 * the current schema for the position in the document.
 *
 * @privateRemarks
 *
 * The live autocompletion in Ace editor fires once, and this is the function
 * that is called on that occasion. However, if the dialog is still open and
 * the user continues to type, we cannot recursively call the language tools to
 * ensure the updated replacement text due to the additional editor text after
 * the intial completion call is correct.
 *
 * We work around this by customizing the `insertMatch` method that gets fired
 * when the user selects the completion item from the list. As we know which
 * completion item we're using, we re-run the `getCompletionResults` method to
 * ensure that the replacement ranges are updated based on how the editor has
 * changed since the original completions were requested.
 *
 * This revised range is then used to clear out the text that was originally
 * inserted, and then we use Ace's `insertSnippet` method to ensure that the
 * text is processed for tokens and tab stops and work show it might do in VS
 * Code. It shouldn't be this hard, but it just kind of is.
 */
const getVegaCompletions = async (
    editor: Ace.Editor,
    point: Ace.Point,
    provider: TSpecProvider,
    editorRole: TEditorRole
): Promise<Ace.Completion[]> =>
    await getCompletionResults(
        editor?.getValue(),
        point,
        provider,
        editorRole
    ).then((list) => {
        logDebug('[customCompleter] completion list', list);
        return (
            list.items.map((i) => ({
                name: i.label,
                value: i.insertText || '',
                caption: i.label,
                snippet: i.insertText,
                completer: {
                    insertMatch: async (e: any) => {
                        const textNew = e.getValue();
                        const posNew = e.getCursorPosition();
                        const updatedSuggestion = await getCompletionResults(
                            textNew,
                            posNew,
                            provider,
                            editorRole
                        ).then((newList) =>
                            newList?.items?.find(
                                (newItem) => newItem.label === i.label
                            )
                        );
                        logDebug('[customCompleter] insertMatch', {
                            textNew,
                            posNew,
                            posPrev: point,
                            updatedSuggestion
                        });
                        const textEdit = <TextEdit>updatedSuggestion.textEdit;
                        e.session.replace(
                            new Range(
                                textEdit.range.start.line,
                                textEdit.range.start.character,
                                textEdit.range.end.line,
                                textEdit.range.end.character
                            ),
                            ''
                        );
                        e.insertSnippet(updatedSuggestion.insertText);
                    }
                },
                //meta: getSnippetVegaMetadata(),
                score: LANGUAGE_KEYWORD_SCORE_BASE
            })) || []
        );
    });

/**
 * Calculate word distance for local completion items (surfaced from Ace).
 */
const getWordDistance = (doc: Ace.EditSession, pos: Ace.Point) => {
    const prefixPos = getWordIndex(doc, pos);
    const words = doc.getValue().split(SPLIT_REGEX);
    const wordScores: IWordScore = {};
    const currentWord = words[prefixPos];
    words.forEach((word, idx) => {
        if (!word || word === currentWord) return;
        const distance = Math.abs(prefixPos - idx);
        const score = words.length - distance;
        if (wordScores[word]) {
            wordScores[word] = Math.max(score, wordScores[word]);
        } else {
            wordScores[word] = score;
        }
    });
    return wordScores;
};

/**
 * Calculate word index for local completions (surfaced from Ace).
 */
const getWordIndex = (doc: Ace.EditSession, pos: Ace.Point) =>
    doc
        .getTextRange(Range.fromPoints({ row: 0, column: 0 }, pos))
        .split(SPLIT_REGEX).length - 1;
