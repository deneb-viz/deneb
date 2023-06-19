import React from 'react';
import { editor } from '../../../core/services';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';
import IVisualEditor = editor.IVisualEditor;
import { IVisualEditorProps } from '../types';
import {
    getAssignedJsonEditor,
    handleComponentUpdate
} from '../utils-jsoneditor';
import { getState } from '../../../store';
import { logRender } from '../../logging';

export class EditorJsonEditor extends React.Component<IVisualEditorProps> {
    private container: HTMLDivElement;
    private editor: IVisualEditor;
    constructor(props: IVisualEditorProps) {
        super(props);
        this.bindEditorElement = this.bindEditorElement.bind(this);
    }
    render() {
        logRender('Editor');
        return (
            <>
                <div className='jsoneditor' ref={this.bindEditorElement} />
            </>
        );
    }

    componentDidUpdate() {
        logRender('Editor - update');
        handleComponentUpdate(this.editor.jsonEditor, this.props.role);
    }

    componentDidMount() {
        this.editor = getAssignedJsonEditor(this.props.role);
        this.editor.createEditor(this.container);
    }

    componentWillUnmount() {
        const {
            editor: { updateStagedConfig, updateStagedSpec }
        } = getState();
        switch (this.editor.role) {
            case 'spec':
                updateStagedSpec(this.editor.jsonEditor.getText());
                break;
            case 'config':
                updateStagedConfig(this.editor.jsonEditor.getText());
                break;
        }
    }

    private bindEditorElement(element: HTMLDivElement) {
        this.container = element;
    }
}
