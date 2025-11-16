import { type CommandsSlice } from './commands';
import { type CreateSliceState } from './create';
import { type DatasetSlice } from './dataset';
import { type DebugSlice } from './debug';
import { type EditorSlice } from './editor';
import { type ExportSliceState } from './export';
import { type FieldUsageSliceState } from './field-usage';
import { type InterfaceSlice } from './interface';
import { type ProcessingSlice } from './processing';
import { type SpecificationSlice } from './specification';
import { type MigrationSlice } from './versioning';
import { type VisualSlice } from './visual';
import { type VisualUpdateSlice } from './visual-update';

export type StoreState = CommandsSlice &
    CreateSliceState &
    DatasetSlice &
    DebugSlice &
    EditorSlice &
    ExportSliceState &
    FieldUsageSliceState &
    InterfaceSlice &
    MigrationSlice &
    ProcessingSlice &
    SpecificationSlice &
    VisualSlice &
    VisualUpdateSlice;
