import React from 'react';

import {
    getAssignedEditor,
    handleComponentUpdate,
    IVisualEditor,
    IVisualEditorProps
} from '../../api/editor';

class Editor extends React.Component<IVisualEditorProps> {
    private container: HTMLDivElement;
    private editor: IVisualEditor;

    constructor(props: IVisualEditorProps) {
        super(props);
        this.bindEditorElement = this.bindEditorElement.bind(this);
    }

    render() {
        return (
            <>
                <div className='jsoneditor' ref={this.bindEditorElement} />
            </>
        );
    }

    componentDidUpdate() {
        handleComponentUpdate(this.editor.jsonEditor, this.props.role);
    }

    componentDidMount() {
        this.editor = getAssignedEditor(this.props.role);
        this.editor.createEditor(this.container);
    }

    private bindEditorElement(element: HTMLDivElement) {
        this.container = element;
    }
}

export default Editor;
