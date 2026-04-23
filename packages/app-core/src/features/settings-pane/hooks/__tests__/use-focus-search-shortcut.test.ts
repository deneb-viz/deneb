/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';

import { isTextEntrySurface } from '../use-focus-search-shortcut';

/**
 * We unit-test the exported guard function directly — rendering the
 * hook would require `@testing-library/react` which is not in this
 * workspace (see `highlight-text.test.tsx`). The guard contains the
 * full behavioural decision we care about; wiring it through
 * `useHotkeys` is straight-line.
 */
describe('isTextEntrySurface', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('returns false for null', () => {
        expect(isTextEntrySurface(null)).toBe(false);
    });

    it('returns false for a plain div', () => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        expect(isTextEntrySurface(el)).toBe(false);
    });

    it('returns true for an input element', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        expect(isTextEntrySurface(input)).toBe(true);
    });

    it('returns true for a textarea element', () => {
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        expect(isTextEntrySurface(textarea)).toBe(true);
    });

    it('returns true for a contenteditable element', () => {
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'true');
        document.body.appendChild(div);
        expect(isTextEntrySurface(div)).toBe(true);
    });

    it('returns true for any descendant of .monaco-editor', () => {
        const editor = document.createElement('div');
        editor.className = 'monaco-editor';
        const leaf = document.createElement('span');
        editor.appendChild(leaf);
        document.body.appendChild(editor);
        expect(isTextEntrySurface(leaf)).toBe(true);
        expect(isTextEntrySurface(editor)).toBe(true);
    });

    it('returns false for a contenteditable="false" element', () => {
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'false');
        document.body.appendChild(div);
        expect(isTextEntrySurface(div)).toBe(false);
    });

    it('returns false for a span outside any monaco-editor subtree', () => {
        const span = document.createElement('span');
        document.body.appendChild(span);
        expect(isTextEntrySurface(span)).toBe(false);
    });
});
