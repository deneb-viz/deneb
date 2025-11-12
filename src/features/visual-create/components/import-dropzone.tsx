import React, { CSSProperties, useEffect, useMemo } from 'react';
import {
    Caption1,
    Label,
    makeStyles,
    Subtitle2,
    tokens,
    useId
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';
import { useDropzone, FileWithPath } from 'react-dropzone';

import store, { getState } from '../../../store';
import { getI18nValue } from '../../i18n';
import { logDebug, logRender } from '../../logging';
import { getValidatedTemplate } from '@deneb-viz/json-processing';
import { PROPERTIES_DEFAULTS } from '@deneb-viz/core-dependencies';
import { type DenebTemplateImportState } from '@deneb-viz/json-processing/template-processing';

/**
 * Base styling for dropzone.
 */
const STYLE_BASE: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: tokens.colorNeutralStroke1,
    borderStyle: 'dashed',
    backgroundColor: tokens.colorNeutralBackground3,
    outline: 'none',
    marginTop: '20px',
    transition: 'border .24s ease-in-out'
};

/**
 * Styling for when dropzone receives focus.
 */
const STYLE_FOCUSED: CSSProperties = {
    borderColor: tokens.colorNeutralForeground2BrandSelected
};

/**
 * Styling for when dropzone receives valid file type.
 */
const STYLE_ACCEPT: CSSProperties = {
    borderColor: tokens.colorPaletteGreenForeground1
};

/**
 * Styling for when dropzone receives invalid file type.
 */
const STYLE_REJECT: CSSProperties = {
    borderColor: tokens.colorPaletteRedForeground1
};

const useStatusStyles = makeStyles({
    success: { color: tokens.colorPaletteGreenForeground1 },
    error: { color: tokens.colorPaletteRedForeground1 },
    other: { display: 'none' }
});

/**
 * Provides the drop-zone for handling file imports when creating a template.
 * Also provides a clipboard listener for handling pasted files or text. Input
 * is processed and will be rejected if not a valid template.
 */
export const ImportDropzone: React.FC = () => {
    const createImportState = store(
        (state) => state.create.importState,
        shallow
    );
    useEffect(() => {
        const onPaste = (event: Event) => {
            logDebug('Content pasted from clipboard.');
            const cbEvent = event as ClipboardEvent;
            const text = cbEvent?.clipboardData?.getData('text');
            if (text) {
                logDebug('Content is text. Dipatching to store...');
                return handleValidation(text);
            }
            logDebug('Attempting file-based import...');
            const items = cbEvent?.clipboardData?.items || {};
            Object.keys(items).forEach((key) => {
                const item = items[key];
                if (item.kind === 'file') {
                    handleFileLoad(item.getAsFile());
                }
            });
        };
        window.addEventListener('paste', onPaste);
        return () => {
            window.removeEventListener('paste', onPaste);
        };
    }, []);
    const {
        getRootProps,
        getInputProps,
        isFocused,
        isDragAccept,
        isDragReject
    } = useDropzone({
        onDrop,
        multiple: false,
        maxFiles: 1,
        accept: {
            'application/json': []
        }
    });
    const style = useMemo(
        () => ({
            ...STYLE_BASE,
            ...(isFocused ? STYLE_FOCUSED : {}),
            ...(isDragAccept ? STYLE_ACCEPT : {}),
            ...(isDragReject ? STYLE_REJECT : {})
        }),
        [isFocused, isDragAccept, isDragReject]
    );
    const labelId = useId('label');
    logRender('ImportDropzone');
    return (
        <div>
            <Label id={labelId}>
                <Subtitle2>
                    {getI18nValue('Text_Import_Template_Subtitle')}
                </Subtitle2>
            </Label>
            <section className='container'>
                <div {...getRootProps({ style })}>
                    <input
                        {...getInputProps()}
                        placeholder={getI18nValue('Text_Button_Import_File')}
                    />
                    <em>{getI18nValue('Text_Button_Import_File')}</em>
                </div>
                <div>
                    <p className={getValidationClassName(createImportState)}>
                        <Caption1>
                            {getValidationContent(createImportState)}
                        </Caption1>
                    </p>
                </div>
            </section>
        </div>
    );
};

/**
 * Ensure correct styling is applied to validation result.
 */
const getValidationClassName = (state: DenebTemplateImportState) => {
    const classes = useStatusStyles();
    switch (state) {
        case 'Success':
            return classes.success;
        case 'Error':
            return classes.error;
        default:
            return classes.other;
    }
};

/**
 * Apply correct message for validation result.
 */
const getValidationContent = (state: DenebTemplateImportState) => {
    switch (state) {
        case 'Success':
            return getI18nValue('Text_Create_Validation_Success');
        case 'Error':
            return getI18nValue('Text_Create_Validation_Error');
        default:
            return '';
    }
};

/**
 * For a given file, read its contents and dispatch to the store.
 */
const handleFileLoad = (file: FileWithPath | File) => {
    const {
        create: { setImportState }
    } = getState();
    setImportState({ importState: 'Loading', refresh: true });
    const reader = new FileReader();
    if (file) {
        reader.onload = (event) =>
            handleValidation(event.target.result.toString());
        reader.readAsText(file);
    }
};

/**
 * Common method to handle validation of template and dispatch of any
 * subsequent state to the store.
 */
const handleValidation = (content: string) => {
    const {
        create: { setImportFile, setImportState }
    } = getState();
    setImportState({ importState: 'Validating', refresh: true });
    const validationResult = getValidatedTemplate(
        content,
        PROPERTIES_DEFAULTS.editor.tabSize
    );
    setImportFile(validationResult);
};

/**
 * When a file is dropped, read its contents and dispatch to the store.
 */
const onDrop = (acceptedFiles: FileWithPath[]) =>
    handleFileLoad(acceptedFiles[0] || null);
