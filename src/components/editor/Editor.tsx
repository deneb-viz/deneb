import * as React from 'react';

import { connect } from 'react-redux';

import Debugger, { standardLog } from '../../Debugger';
import { configEditorService, specEditorService } from '../../services';

import { IEditorProps, IEditorService } from '../../types';

class Editor extends React.Component<IEditorProps> {
    // Container the editor will reside in
    private container: HTMLDivElement;
    // Editor services, which will handle most of the stuff we need
    private editor: IEditorService;

    constructor(props: IEditorProps) {
        super(props);
        this.bindEditorElement = this.bindEditorElement.bind(this);
    }

    @standardLog()
    render() {
        Debugger.log('Rendering Component: [Editor]...');
        return <div className='jsoneditor' ref={this.bindEditorElement} />;
    }

    @standardLog()
    componentDidUpdate() {
        Debugger.log('Updated Component: [Editor]');
        this.editor.setProviderSchema();
        this.editor.resize();
        if (!this.props.isDialogOpen) {
            this.editor.focus();
            this.editor.updateCompleters();
        }
    }

    @standardLog()
    componentDidMount() {
        Debugger.log(
            `Mounted Component: [Editor]; role = ${this.props.operation}`
        );
        switch (this.props.operation) {
            case 'spec': {
                this.editor = specEditorService;
                break;
            }
            case 'config': {
                this.editor = configEditorService;
                break;
            }
        }
        this.editor.createEditor(this.container);
    }

    @standardLog()
    private bindEditorElement(element: HTMLDivElement) {
        Debugger.log('Binding editor to element...');
        this.container = element;
    }
}

export default Editor;
