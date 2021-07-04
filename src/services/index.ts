import { DataLoadingService } from './DataLoadingService';
import { SelectionHandlerService } from './SelectionHandlerService';

const dataLoadingService = new DataLoadingService(),
    selectionHandlerService = new SelectionHandlerService();

export { dataLoadingService, selectionHandlerService };
