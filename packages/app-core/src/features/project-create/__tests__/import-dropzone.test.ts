import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDenebState } from '../../../state';
import {
    handleFileLoad,
    ignorePendingFileRead
} from '../components/import-dropzone';

/** A file reader whose reads the test finishes by hand. */
class ManualFileReader {
    static started: ManualFileReader[] = [];
    onload: ((event: { target: { result: string } }) => void) | null = null;
    readAsText() {
        ManualFileReader.started.push(this);
    }
    finish(result: string) {
        this.onload?.({ target: { result } });
    }
}

const FILE = new File(['{}'], 'template.json');

const importState = () => getDenebState().create.importState;

describe('ImportDropzone file reads', () => {
    beforeEach(() => {
        ManualFileReader.started = [];
        vi.stubGlobal('FileReader', ManualFileReader);
        getDenebState().create.setMode('import');
    });

    afterEach(() => {
        ignorePendingFileRead();
        vi.unstubAllGlobals();
    });

    it('validates the file once its read finishes', () => {
        handleFileLoad(FILE);
        expect(importState()).toBe('Loading');
        ManualFileReader.started[0].finish('not a template');
        expect(importState()).not.toBe('Loading');
    });

    it('ignores a read that finishes after the import is left and reset', () => {
        handleFileLoad(FILE);
        ignorePendingFileRead();
        getDenebState().create.setMode('import');
        ManualFileReader.started[0].finish('not a template');
        expect(importState()).toBe('None');
    });

    it('ignores an earlier read once another file is chosen', () => {
        handleFileLoad(FILE);
        handleFileLoad(FILE);
        const [earlier, latest] = ManualFileReader.started;
        earlier.finish('not a template');
        expect(importState()).toBe('Loading');
        latest.finish('not a template');
        expect(importState()).not.toBe('Loading');
    });
});
