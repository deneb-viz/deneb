import { CommandService } from './CommandService';
import { DataLoadingService } from './DataLoadingService';
import { DataViewService } from './DataViewService';
import { EditorService } from './EditorService';
import { PropertyService } from './PropertyService';
import { RenderingService } from './RenderingService';
import { SelectionHandlerService } from './SelectionHandlerService';
import { SpecificationService } from './SpecificationService';
import { TemplateService } from './TemplateService';

const dataViewService = new DataViewService(),
    propertyService = new PropertyService(),
    commandService = new CommandService(),
    dataLoadingService = new DataLoadingService(),
    renderingService = new RenderingService(),
    templateService = new TemplateService(),
    selectionHandlerService = new SelectionHandlerService(),
    specificationService = new SpecificationService(),
    configEditorService = new EditorService('config'),
    specEditorService = new EditorService('spec');

export {
    commandService,
    configEditorService,
    dataLoadingService,
    dataViewService,
    propertyService,
    renderingService,
    selectionHandlerService,
    specificationService,
    specEditorService,
    templateService
};
