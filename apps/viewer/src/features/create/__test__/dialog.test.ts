import type powerbi from 'powerbi-visuals-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDenebState, useDenebState } from '@deneb-viz/app-core';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import {
    DIALOG_ACTION,
    IMPORT_DIALOG_ID,
    IMPORT_DIALOG_OPTIONS,
    isImportDialogResult,
    openImportDialog,
    toPortableFields
} from '../dialog';
import { ImportDialog } from '../components/import-dialog';

const INITIAL_STATE = useDenebState.getState();

const RESULT = {
    metadata: {
        deneb: { provider: 'vegaLite', metaVersion: 2 },
        datasets: {
            [DATASET_DEFAULT_NAME]: [
                {
                    key: '__dataset.0__',
                    name: 'Category',
                    suppliedObjectName: 'Product',
                    kind: 'column',
                    type: 'text'
                }
            ]
        }
    },
    candidates: {
        spec: '{"mark":"bar","encoding":{"x":{"field":"__dataset.0__"}}}',
        config: '{}'
    }
};

const fakeHost = (
    openModalDialog: () => Promise<powerbi.extensibility.visual.ModalDialogResult>
) =>
    ({
        locale: 'en-US',
        openModalDialog: vi.fn(openModalDialog)
    }) as unknown as powerbi.extensibility.visual.IVisualHost;

beforeEach(() => {
    useDenebState.setState(INITIAL_STATE, true);
});

describe('import dialog contract', () => {
    it('is registered for Power BI to construct by id', () => {
        const registry = (
            globalThis as { dialogRegistry?: Record<string, unknown> }
        ).dialogRegistry;
        expect(registry?.[IMPORT_DIALOG_ID]).toBe(ImportDialog);
    });

    it('opens centred at 800×720, with its own buttons rather than Power BI’s', () => {
        expect(IMPORT_DIALOG_OPTIONS).toEqual({
            size: { width: 800, height: 720 },
            position: { type: 0 },
            actionButtons: []
        });
    });

    it('passes fields to the dialog as plain data, without host metadata', () => {
        expect(
            toPortableFields({
                Product: {
                    id: 'Sales.Product',
                    role: 'grouping',
                    dataType: 'text',
                    description: 'Product name',
                    isSupportField: false,
                    hostMetadata: { column: { queryName: 'Sales.Product' } }
                }
            })
        ).toEqual({
            Product: {
                id: 'Sales.Product',
                role: 'grouping',
                dataType: 'text',
                description: 'Product name',
                isSupportField: false
            }
        });
    });

    it('accepts only results that carry a template and its spec', () => {
        expect(isImportDialogResult(RESULT)).toBe(true);
        expect(isImportDialogResult(undefined)).toBe(false);
        expect(isImportDialogResult({})).toBe(false);
        expect(
            isImportDialogResult({
                metadata: null,
                candidates: RESULT.candidates
            })
        ).toBe(false);
        expect(isImportDialogResult({ metadata: RESULT.metadata })).toBe(false);
    });
});

describe('openImportDialog', () => {
    it('opens the dialog with the locale and fields, and creates the project when the author clicks Create', async () => {
        useDenebState.setState((state) => ({
            dataset: {
                ...state.dataset,
                fields: {
                    Product: {
                        role: 'grouping',
                        hostMetadata: { secret: true }
                    }
                }
            }
        }));
        const host = fakeHost(() =>
            Promise.resolve({ actionId: DIALOG_ACTION.OK, resultState: RESULT })
        );
        const onCreateProject = vi.fn();

        await openImportDialog({
            host,
            title: 'Import template',
            onCreateProject
        });

        expect(host.openModalDialog).toHaveBeenCalledWith(
            IMPORT_DIALOG_ID,
            { ...IMPORT_DIALOG_OPTIONS, title: 'Import template' },
            { locale: 'en-US', fields: { Product: { role: 'grouping' } } }
        );
        expect(onCreateProject).toHaveBeenCalledTimes(1);
        const { project } = getDenebState();
        expect(project.spec).toContain('Product');
        expect(project.initializationCount).toBe(1);
    });

    it.each([
        ['Cancel', { actionId: DIALOG_ACTION.Cancel, resultState: RESULT }],
        ['the header close', { actionId: 0, resultState: {} }],
        [
            'a result without a template',
            { actionId: DIALOG_ACTION.OK, resultState: {} }
        ]
    ])('changes nothing after %s', async (_label, result) => {
        const onCreateProject = vi.fn();

        await openImportDialog({
            host: fakeHost(() => Promise.resolve(result)),
            title: 'Import template',
            onCreateProject
        });

        expect(onCreateProject).not.toHaveBeenCalled();
        expect(getDenebState().project.initializationCount).toBe(0);
    });

    it('changes nothing, and does not throw, when the dialog fails to open', async () => {
        const onCreateProject = vi.fn();

        await expect(
            openImportDialog({
                host: fakeHost(() => Promise.reject(new Error('not allowed'))),
                title: 'Import template',
                onCreateProject
            })
        ).resolves.toBeUndefined();

        expect(onCreateProject).not.toHaveBeenCalled();
        expect(getDenebState().project.initializationCount).toBe(0);
    });
});
