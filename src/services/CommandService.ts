import * as ace from 'ace-builds';
import Ace = ace.Ace;

import Debugger, { standardLog } from '../Debugger';
import { propertyService, specificationService } from '.';
import store from '../store';
import {
    toggleAutoApply,
    fourd3d3d,
    updateSelectedOperation
} from '../store/visualReducer';
import { updateSelectedTemplate } from '../store/templateReducer';
import {
    ICommandService,
    TEditorOperation,
    TSpecProvider,
    TSpecRenderMode
} from '../types';
import { visualMetadata } from '../config';

const owner = 'CommandService';

export class CommandService implements ICommandService {
    constructor() {
        Debugger.log(`Instantiating new ${owner}...`);
    }

    @standardLog()
    updateProvider(provider: TSpecProvider) {
        Debugger.log('Updating spec provider in visual properties...');
        const replace = propertyService.resolveObjectProperties('vega', [
            { name: 'provider', value: provider }
        ]);
        propertyService.updateObjectProperties(replace);
    }

    @standardLog()
    updateRenderMode(renderMode: TSpecRenderMode) {
        Debugger.log('Updating spec render mode in visual properties...');
        const replace = propertyService.resolveObjectProperties('vega', [
            { name: 'renderMode', value: renderMode }
        ]);
        propertyService.updateObjectProperties(replace);
    }

    @standardLog()
    updateBooleanProperty(name: string, value: boolean) {
        Debugger.log('Updating boolean prop...');
        const replace = propertyService.resolveObjectProperties('vega', [
            { name: name, value: value }
        ]);
        propertyService.updateObjectProperties(replace);
    }

    @standardLog()
    applyChanges() {
        Debugger.log('Applying changes...');
        specificationService.persist();
    }

    @standardLog()
    toggleAutoApply() {
        Debugger.log('Toggling auto-apply...');
        this.applyChanges();
        store.dispatch(toggleAutoApply());
    }

    @standardLog()
    repairFormatJson() {
        Debugger.log('Fixing spec and config...');
        specificationService.fixAndFormat();
    }

    @standardLog()
    createNewSpec() {
        Debugger.log('Opening new spec dialog...');
        Debugger.log('Flagging modal dialog for open...');
        propertyService.updateObjectProperties(
            propertyService.resolveObjectProperties('vega', [
                { name: 'isNewDialogOpen', value: true }
            ])
        );
        store.dispatch(updateSelectedTemplate(0));
    }

    @standardLog()
    closeNewDialog() {
        Debugger.log('Closing modal dialog...');
        propertyService.updateObjectProperties(
            propertyService.resolveObjectProperties('vega', [
                { name: 'isNewDialogOpen', value: false }
            ])
        );
    }

    @standardLog()
    openEditorPivotItem(operation: TEditorOperation) {
        Debugger.log(`Attempting to open editor pivot item: ${operation}...`);
        store.dispatch(updateSelectedOperation(operation));
    }

    @standardLog()
    openHelpSite() {
        Debugger.log('Launching support URL...', visualMetadata.supportUrl);
        const { launchUrl } = store.getState().visual;
        launchUrl(visualMetadata.supportUrl);
    }

    fourd3d3d() {
        store.dispatch(fourd3d3d(true));
    }
}
