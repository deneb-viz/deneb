import { CommandService } from './CommandService';
import { DataLoadingService } from './DataLoadingService';
import { EditorService } from './EditorService';
import { SelectionHandlerService } from './SelectionHandlerService';

const commandService = new CommandService(),
    dataLoadingService = new DataLoadingService(),
    selectionHandlerService = new SelectionHandlerService(),
    configEditorService = new EditorService('config'),
    specEditorService = new EditorService('spec');

export {
    commandService,
    configEditorService,
    dataLoadingService,
    selectionHandlerService,
    specEditorService
};
