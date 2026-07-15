// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { isEditableEventTarget } from '../settings-pane-utils';

/**
 * Important #10: `settings-pane.tsx`'s context-menu interception used to
 * call `preventDefault()` unconditionally on the pane root, suppressing the
 * browser's native context menu inside the search box `<input>` too — no
 * right-click-paste, no Shift+F10 editing menu. `isEditableEventTarget` is
 * the predicate the handlers now check before calling `preventDefault()`.
 */
describe('isEditableEventTarget', () => {
    it('returns true for an <input> element', () => {
        const input = document.createElement('input');
        expect(isEditableEventTarget(input)).toBe(true);
    });

    it('returns true for a <textarea> element', () => {
        const textarea = document.createElement('textarea');
        expect(isEditableEventTarget(textarea)).toBe(true);
    });

    it('returns true for an explicit contenteditable element', () => {
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'true');
        expect(isEditableEventTarget(div)).toBe(true);
    });

    it('returns true for a descendant of an <input> (e.g. an internal wrapper span)', () => {
        const input = document.createElement('input');
        const span = document.createElement('span');
        input.appendChild(span);
        expect(isEditableEventTarget(span)).toBe(true);
    });

    it('returns false for a non-editable element, e.g. the pane root div', () => {
        const div = document.createElement('div');
        expect(isEditableEventTarget(div)).toBe(false);
    });

    it('returns false for a div with contenteditable="false"', () => {
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'false');
        expect(isEditableEventTarget(div)).toBe(false);
    });

    it('returns false for null or undefined targets', () => {
        expect(isEditableEventTarget(null)).toBe(false);
        expect(isEditableEventTarget(undefined)).toBe(false);
    });

    it('returns false for a bare EventTarget that is not an Element', () => {
        const bareTarget = new EventTarget();
        expect(isEditableEventTarget(bareTarget)).toBe(false);
    });
});
