// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import {
    getTabbableElements,
    handleTabWrapAround,
    TABBABLE_SELECTOR
} from '../keyboard-focus';

/**
 * Create a container with the given inner HTML and append it to the document
 * body so that focus operations work correctly.
 */
const createContainer = (innerHTML: string): HTMLElement => {
    const container = document.createElement('div');
    container.innerHTML = innerHTML;
    document.body.appendChild(container);
    return container;
};

describe('TABBABLE_SELECTOR', () => {
    it('should match enabled input elements', () => {
        const container = createContainer(
            '<input type="text" /><input type="range" />'
        );
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(2);
    });

    it('should not match disabled input elements', () => {
        const container = createContainer('<input type="text" disabled />');
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(0);
    });

    it('should not match elements with tabindex="-1"', () => {
        const container = createContainer(
            '<input type="text" tabindex="-1" />'
        );
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(0);
    });

    it('should match select elements', () => {
        const container = createContainer(
            '<select><option>A</option></select>'
        );
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });

    it('should match buttons', () => {
        const container = createContainer('<button>Click</button>');
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });

    it('should match anchors with href', () => {
        const container = createContainer('<a href="#">Link</a>');
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });

    it('should not match anchors without href', () => {
        const container = createContainer('<a>Link</a>');
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(0);
    });

    it('should match elements with tabindex="0"', () => {
        const container = createContainer('<div tabindex="0">Focusable</div>');
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });
});

describe('getTabbableElements', () => {
    it('should return tabbable elements in DOM order', () => {
        const container = createContainer(
            '<button>B</button><input type="text" /><select><option>A</option></select>'
        );
        const elements = getTabbableElements(container);
        expect(elements.length).toBe(3);
        expect(elements[0].tagName).toBe('BUTTON');
        expect(elements[1].tagName).toBe('INPUT');
        expect(elements[2].tagName).toBe('SELECT');
    });

    it('should return an empty array when no tabbable elements exist', () => {
        const container = createContainer('<div>Not tabbable</div>');
        const elements = getTabbableElements(container);
        expect(elements.length).toBe(0);
    });

    it('should exclude disabled elements', () => {
        const container = createContainer(
            '<input type="text" /><input type="text" disabled />'
        );
        const elements = getTabbableElements(container);
        expect(elements.length).toBe(1);
    });
});

describe('handleTabWrapAround', () => {
    it('should return false when no tabbable elements exist', () => {
        const container = createContainer('<div>Empty</div>');
        const result = handleTabWrapAround(container, null, false);
        expect(result).toBe(false);
    });

    it('should wrap forward from the last element to the first', () => {
        const container = createContainer(
            '<input id="first" /><input id="last" />'
        );
        const last = container.querySelector<HTMLElement>('#last')!;
        const first = container.querySelector<HTMLElement>('#first')!;
        const focusSpy = vi.spyOn(first, 'focus');

        const result = handleTabWrapAround(container, last, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should wrap backward from the first element to the last', () => {
        const container = createContainer(
            '<input id="first" /><input id="last" />'
        );
        const first = container.querySelector<HTMLElement>('#first')!;
        const last = container.querySelector<HTMLElement>('#last')!;
        const focusSpy = vi.spyOn(last, 'focus');

        const result = handleTabWrapAround(container, first, true);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should not wrap when Tab is pressed on a middle element', () => {
        const container = createContainer(
            '<input id="first" /><input id="middle" /><input id="last" />'
        );
        const middle = container.querySelector<HTMLElement>('#middle')!;

        const result = handleTabWrapAround(container, middle, false);

        expect(result).toBe(false);
    });

    it('should not wrap when Shift+Tab is pressed on a middle element', () => {
        const container = createContainer(
            '<input id="first" /><input id="middle" /><input id="last" />'
        );
        const middle = container.querySelector<HTMLElement>('#middle')!;

        const result = handleTabWrapAround(container, middle, true);

        expect(result).toBe(false);
    });

    it('should focus the first element on Tab when active element is outside the tabbable set', () => {
        const container = createContainer('<input id="only" />');
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, document.body, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should focus the last element on Shift+Tab when active element is outside the tabbable set', () => {
        const container = createContainer(
            '<input id="first" /><input id="last" />'
        );
        const last = container.querySelector<HTMLElement>('#last')!;
        const focusSpy = vi.spyOn(last, 'focus');

        const result = handleTabWrapAround(container, document.body, true);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should focus the first element on Tab when active element is null', () => {
        const container = createContainer('<input id="only" />');
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, null, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should handle a single tabbable element correctly for Tab', () => {
        const container = createContainer('<input id="only" />');
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        // Active is the only element, Tab should wrap to itself
        const result = handleTabWrapAround(container, only, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should handle a single tabbable element correctly for Shift+Tab', () => {
        const container = createContainer('<input id="only" />');
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, only, true);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
});
