import { type InterfaceMode } from '@deneb-viz/app-core';
import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';

export interface IExportSpecCommandTestOptions {
    editorIsDirty: boolean;
    specification: CompiledSpecification;
    interfaceMode: InterfaceMode;
}

/**
 * For other zoom commands, these are the things we need to test.
 */
export interface IZoomOtherCommandTestOptions {
    specification: CompiledSpecification;
    interfaceMode: InterfaceMode;
}

/**
 * For zoom level-related commands, these are the things we need to test.
 */
export interface IZoomLevelCommandTestOptions {
    value: number;
    specification: CompiledSpecification;
    interfaceMode: InterfaceMode;
}
