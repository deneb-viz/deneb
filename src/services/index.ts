import { CommandService } from './CommandService';
import { DataLoadingService } from './DataLoadingService';
import { EditorService } from './EditorService';
import { PropertyService } from './PropertyService';
import { SelectionHandlerService } from './SelectionHandlerService';
import { SpecificationService } from './SpecificationService';

const propertyService = new PropertyService(),
    commandService = new CommandService(),
    dataLoadingService = new DataLoadingService(),
    selectionHandlerService = new SelectionHandlerService(),
    specificationService = new SpecificationService(),
    configEditorService = new EditorService('config'),
    specEditorService = new EditorService('spec');

export {
    commandService,
    configEditorService,
    dataLoadingService,
    propertyService,
    selectionHandlerService,
    specificationService,
    specEditorService
};
