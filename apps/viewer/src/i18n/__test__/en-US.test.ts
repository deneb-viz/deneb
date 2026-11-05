// @vitest-environment node
import { describe, expect, it } from 'vitest';

import en_US from '../en-US.json';
import { readAppFiles } from '../../__test__/invariants/_files';

describe('en-US strings', () => {
    it('name the data role as Power BI shows it, never by its internal name', () => {
        const naming = Object.entries(en_US)
            .filter(([, text]) => /\bDataset\b/.test(text))
            .map(([key]) => key);
        expect(naming).toEqual([]);
    });

    it('include every viewer string the code refers to', () => {
        const referenced = new Set(
            readAppFiles()
                .filter(
                    ({ path }) =>
                        path.startsWith('src/') && !path.includes('__test__')
                )
                .flatMap(
                    ({ content }) => content.match(/PowerBI_Viewer_\w+/g) ?? []
                )
        );
        const missing = [...referenced].filter((key) => !(key in en_US));
        expect(missing).toEqual([]);
    });
});
