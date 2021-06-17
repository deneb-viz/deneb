import { DataLoadingService } from './DataLoadingService';
import { EditorService } from './EditorService';
import { SelectionHandlerService } from './SelectionHandlerService';

const dataLoadingService = new DataLoadingService(),
    selectionHandlerService = new SelectionHandlerService(),
    configEditorService = new EditorService('config'),
    specEditorService = new EditorService('spec');

export {
    configEditorService,
    dataLoadingService,
    selectionHandlerService,
    specEditorService
};
