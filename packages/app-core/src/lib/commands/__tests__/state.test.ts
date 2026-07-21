import { describe, expect, it } from 'vitest';
import type { CompilationResult } from '@deneb-viz/vega-runtime/compilation';
import { VISUAL_PREVIEW_ZOOM_CONFIGURATION } from '@deneb-viz/configuration';

import {
    evaluateExportSpecCommandState,
    evaluateZoomCommandsState
} from '../state';

/**
 * Pure-helper unit tests for the two `commands` slice evaluators added in
 * Unit 2 of the recovery-on-compile plan. The helpers are the single
 * source of truth shared between the user-action writers
 * (`handleUpdateEditorZoomLevel`, `handleUpdateChanges`,
 * `handleUpdateIsDirty`) and `handleCompile`'s success-branch recovery
 * write. These tests pin the predicate logic in isolation; integration
 * coverage lives in `state/__tests__/commands-recovery.test.ts`.
 */

const READY_RESULT: CompilationResult = {
    status: 'ready',
    parsed: {} as never,
    embedOptions: {}
};
const ERROR_RESULT: CompilationResult = {
    status: 'error',
    parsed: {} as never,
    embedOptions: {},
    errors: ['boom']
};

const ZOOM_MIN = VISUAL_PREVIEW_ZOOM_CONFIGURATION.min;
const ZOOM_MAX = VISUAL_PREVIEW_ZOOM_CONFIGURATION.max;
const ZOOM_MID = VISUAL_PREVIEW_ZOOM_CONFIGURATION.default;

describe('evaluateZoomCommandsState', () => {
    it('returns all four flags true when at a mid zoom level and compilation is ready', () => {
        expect(evaluateZoomCommandsState(ZOOM_MID, READY_RESULT)).toEqual({
            zoomFit: true,
            zoomIn: true,
            zoomOut: true,
            zoomReset: true
        });
    });

    it('returns zoomOut false at the min zoom boundary even when ready', () => {
        const result = evaluateZoomCommandsState(ZOOM_MIN, READY_RESULT);
        expect(result.zoomOut).toBe(false);
        expect(result.zoomIn).toBe(true);
        expect(result.zoomFit).toBe(true);
        expect(result.zoomReset).toBe(true);
    });

    it('returns zoomIn false at the max zoom boundary even when ready', () => {
        const result = evaluateZoomCommandsState(ZOOM_MAX, READY_RESULT);
        expect(result.zoomIn).toBe(false);
        expect(result.zoomOut).toBe(true);
        expect(result.zoomFit).toBe(true);
        expect(result.zoomReset).toBe(true);
    });

    it('returns all four flags false when compilation is in error, regardless of zoom level', () => {
        expect(evaluateZoomCommandsState(ZOOM_MID, ERROR_RESULT)).toEqual({
            zoomFit: false,
            zoomIn: false,
            zoomOut: false,
            zoomReset: false
        });
    });

    it('returns all four flags false when compilation result is null, regardless of zoom level', () => {
        expect(evaluateZoomCommandsState(ZOOM_MID, null)).toEqual({
            zoomFit: false,
            zoomIn: false,
            zoomOut: false,
            zoomReset: false
        });
    });

    it('returns all four flags false at the min boundary when compilation is in error', () => {
        expect(evaluateZoomCommandsState(ZOOM_MIN, ERROR_RESULT)).toEqual({
            zoomFit: false,
            zoomIn: false,
            zoomOut: false,
            zoomReset: false
        });
    });

    it('returns all four flags false at the max boundary when compilation is null', () => {
        expect(evaluateZoomCommandsState(ZOOM_MAX, null)).toEqual({
            zoomFit: false,
            zoomIn: false,
            zoomOut: false,
            zoomReset: false
        });
    });
});

describe('evaluateExportSpecCommandState', () => {
    it('returns exportSpecification true when editor is clean and compilation is ready', () => {
        expect(evaluateExportSpecCommandState(false, READY_RESULT)).toEqual({
            exportSpecification: true
        });
    });

    it('returns exportSpecification false when editor is dirty even if compilation is ready', () => {
        expect(evaluateExportSpecCommandState(true, READY_RESULT)).toEqual({
            exportSpecification: false
        });
    });

    it('returns exportSpecification false when compilation is in error even if editor is clean', () => {
        expect(evaluateExportSpecCommandState(false, ERROR_RESULT)).toEqual({
            exportSpecification: false
        });
    });

    it('returns exportSpecification false when both editor is dirty and compilation is in error', () => {
        expect(evaluateExportSpecCommandState(true, ERROR_RESULT)).toEqual({
            exportSpecification: false
        });
    });

    it('returns exportSpecification false when compilation result is null and editor is clean', () => {
        expect(evaluateExportSpecCommandState(false, null)).toEqual({
            exportSpecification: false
        });
    });

    it('returns exportSpecification false when compilation result is null and editor is dirty', () => {
        expect(evaluateExportSpecCommandState(true, null)).toEqual({
            exportSpecification: false
        });
    });
});
