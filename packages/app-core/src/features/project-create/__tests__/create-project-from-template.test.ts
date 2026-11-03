import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DATASET_DEFAULT_NAME } from '@deneb-viz/data-core/dataset';
import type { UsermetaDatasetField } from '@deneb-viz/data-core/field';
import type { UsermetaTemplate } from '@deneb-viz/template-usermeta';

import { getDenebState, useDenebState } from '../../../state';
import { createProjectFromTemplate } from '../create-project-from-template';

const INITIAL_STATE = useDenebState.getState();

const CATEGORY: UsermetaDatasetField = {
    key: '__dataset.0__',
    name: 'Category',
    suppliedObjectName: 'Product',
    kind: 'column',
    type: 'text',
    supportFieldConfiguration: { highlight: true, formatted: true }
};

const PARAMETER: UsermetaDatasetField = {
    key: '__dataset.1__',
    name: 'Measure choice',
    suppliedObjectName: 'Revenue',
    kind: 'parameter',
    type: 'numeric'
};

const templateWith = (
    fields: UsermetaDatasetField[],
    provider: string | null = 'vegaLite'
) =>
    ({
        deneb: { provider, metaVersion: 2 },
        datasets: { [DATASET_DEFAULT_NAME]: fields }
    }) as unknown as UsermetaTemplate;

const CANDIDATES = {
    spec: '{"mark":"bar","encoding":{"x":{"field":"__dataset.0__"}}}',
    config: '{"padding":5}'
};

const withDatasetFields = (
    fields: ReturnType<typeof getDenebState>['dataset']['fields']
) =>
    useDenebState.setState((state) => ({
        dataset: { ...state.dataset, fields }
    }));

beforeEach(() => {
    useDenebState.setState(INITIAL_STATE, true);
});

describe('createProjectFromTemplate', () => {
    it('creates the project from the template, with the assigned fields in place of its placeholders', async () => {
        await createProjectFromTemplate({
            metadata: templateWith([CATEGORY]),
            candidates: CANDIDATES
        });

        const { project } = getDenebState();
        expect(project.spec).toContain('Product');
        expect(project.spec).not.toContain('__dataset.0__');
        expect(project.config).toBe(CANDIDATES.config);
        expect(project.provider).toBe('vegaLite');
        expect(project.denebMetaVersion).toBe(2);
        expect(project.initializationCount).toBe(1);
    });

    it('keys support field settings by the assigned field names', async () => {
        await createProjectFromTemplate({
            metadata: templateWith([CATEGORY]),
            candidates: CANDIDATES
        });

        expect(
            getDenebState().project.supportFieldConfiguration
        ).toHaveProperty('Product');
        expect(
            getDenebState().project.supportFieldConfiguration
        ).not.toHaveProperty('__dataset.0__');
    });

    it('treats a regular field assigned to a parameter placeholder as a parameter', async () => {
        withDatasetFields({ Revenue: { role: 'aggregation' } });

        await createProjectFromTemplate({
            metadata: templateWith([CATEGORY, PARAMETER]),
            candidates: CANDIDATES
        });

        const { project } = getDenebState();
        expect(
            project.supportFieldConfiguration?.Revenue?.treatAsParameter
        ).toBe(true);
        expect(project.consolidateFieldParameters).toBe(true);
    });

    it('persists through the platform before the project initialises', async () => {
        const onCreateProject = vi.fn(() => {
            expect(getDenebState().project.initializationCount).toBe(0);
        });
        const metadata = templateWith([CATEGORY]);

        await createProjectFromTemplate({
            metadata,
            candidates: CANDIDATES,
            onCreateProject
        });

        expect(onCreateProject).toHaveBeenCalledTimes(1);
        expect(onCreateProject).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata,
                config: CANDIDATES.config,
                spec: getDenebState().project.spec
            })
        );
        expect(getDenebState().project.initializationCount).toBe(1);
    });

    it('still initialises the project when persisting fails', async () => {
        await createProjectFromTemplate({
            metadata: templateWith([CATEGORY]),
            candidates: CANDIDATES,
            onCreateProject: () => Promise.reject(new Error('host refused'))
        });

        expect(getDenebState().project.initializationCount).toBe(1);
    });

    it('creates nothing from a template without a provider, or without a template', async () => {
        const onCreateProject = vi.fn();

        await createProjectFromTemplate({
            metadata: templateWith([CATEGORY], null),
            candidates: CANDIDATES,
            onCreateProject
        });
        await createProjectFromTemplate({
            metadata: null,
            candidates: CANDIDATES,
            onCreateProject
        });

        expect(onCreateProject).not.toHaveBeenCalled();
        expect(getDenebState().project.initializationCount).toBe(0);
    });
});
