// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    getTabbableElements,
    handleTabWrapAround,
    TABBABLE_SELECTOR
} from '../keyboard-focus';

type ElementSpec = {
    tag: string;
    attrs?: Record<string, string>;
    children?: ElementSpec[];
    text?: string;
};

/**
 * Build a DOM element tree from a spec and append it to document.body.
 */
const createContainer = (...specs: ElementSpec[]): HTMLElement => {
    const container = document.createElement('div');
    for (const spec of specs) {
        container.appendChild(buildElement(spec));
    }
    document.body.appendChild(container);
    return container;
};

const buildElement = (spec: ElementSpec): HTMLElement => {
    const el = document.createElement(spec.tag);
    if (spec.attrs) {
        for (const [key, value] of Object.entries(spec.attrs)) {
            el.setAttribute(key, value);
        }
    }
    if (spec.text) {
        el.textContent = spec.text;
    }
    if (spec.children) {
        for (const child of spec.children) {
            el.appendChild(buildElement(child));
        }
    }
    return el;
};

afterEach(() => {
    document.body.replaceChildren();
});

describe('TABBABLE_SELECTOR', () => {
    it('should match enabled input elements', () => {
        const container = createContainer(
            { tag: 'input', attrs: { type: 'text' } },
            { tag: 'input', attrs: { type: 'range' } }
        );
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(2);
    });

    it('should not match disabled input elements', () => {
        const container = createContainer({
            tag: 'input',
            attrs: { type: 'text', disabled: '' }
        });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(0);
    });

    it('should not match elements with tabindex="-1"', () => {
        const container = createContainer({
            tag: 'input',
            attrs: { type: 'text', tabindex: '-1' }
        });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(0);
    });

    it('should match select elements', () => {
        const container = createContainer({
            tag: 'select',
            children: [{ tag: 'option', text: 'A' }]
        });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });

    it('should match buttons', () => {
        const container = createContainer({ tag: 'button', text: 'Click' });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });

    it('should match anchors with href', () => {
        const container = createContainer({
            tag: 'a',
            attrs: { href: '#' },
            text: 'Link'
        });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });

    it('should not match anchors without href', () => {
        const container = createContainer({ tag: 'a', text: 'Link' });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(0);
    });

    it('should match elements with tabindex="0"', () => {
        const container = createContainer({
            tag: 'div',
            attrs: { tabindex: '0' },
            text: 'Focusable'
        });
        const matches = container.querySelectorAll(TABBABLE_SELECTOR);
        expect(matches.length).toBe(1);
    });
});

describe('getTabbableElements', () => {
    it('should return tabbable elements in DOM order', () => {
        const container = createContainer(
            { tag: 'button', text: 'B' },
            { tag: 'input', attrs: { type: 'text' } },
            {
                tag: 'select',
                children: [{ tag: 'option', text: 'A' }]
            }
        );
        const elements = getTabbableElements(container);
        expect(elements.length).toBe(3);
        expect(elements[0].tagName).toBe('BUTTON');
        expect(elements[1].tagName).toBe('INPUT');
        expect(elements[2].tagName).toBe('SELECT');
    });

    it('should return an empty array when no tabbable elements exist', () => {
        const container = createContainer({
            tag: 'div',
            text: 'Not tabbable'
        });
        const elements = getTabbableElements(container);
        expect(elements.length).toBe(0);
    });

    it('should exclude disabled elements', () => {
        const container = createContainer(
            { tag: 'input', attrs: { type: 'text' } },
            { tag: 'input', attrs: { type: 'text', disabled: '' } }
        );
        const elements = getTabbableElements(container);
        expect(elements.length).toBe(1);
    });
});

describe('handleTabWrapAround', () => {
    it('should return false when no tabbable elements exist', () => {
        const container = createContainer({ tag: 'div', text: 'Empty' });
        const result = handleTabWrapAround(container, null, false);
        expect(result).toBe(false);
    });

    it('should wrap forward from the last element to the first', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } }
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
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } }
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
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'middle' } },
            { tag: 'input', attrs: { id: 'last' } }
        );
        const middle = container.querySelector<HTMLElement>('#middle')!;

        const result = handleTabWrapAround(container, middle, false);

        expect(result).toBe(false);
    });

    it('should not wrap when Shift+Tab is pressed on a middle element', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'middle' } },
            { tag: 'input', attrs: { id: 'last' } }
        );
        const middle = container.querySelector<HTMLElement>('#middle')!;

        const result = handleTabWrapAround(container, middle, true);

        expect(result).toBe(false);
    });

    it('should focus the first element on Tab when active element is outside the tabbable set', () => {
        const container = createContainer({
            tag: 'input',
            attrs: { id: 'only' }
        });
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, document.body, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should focus the last element on Shift+Tab when active element is outside the tabbable set', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } }
        );
        const last = container.querySelector<HTMLElement>('#last')!;
        const focusSpy = vi.spyOn(last, 'focus');

        const result = handleTabWrapAround(container, document.body, true);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should focus the first element on Tab when active element is null', () => {
        const container = createContainer({
            tag: 'input',
            attrs: { id: 'only' }
        });
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, null, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should handle a single tabbable element correctly for Tab', () => {
        const container = createContainer({
            tag: 'input',
            attrs: { id: 'only' }
        });
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, only, false);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('should handle a single tabbable element correctly for Shift+Tab', () => {
        const container = createContainer({
            tag: 'input',
            attrs: { id: 'only' }
        });
        const only = container.querySelector<HTMLElement>('#only')!;
        const focusSpy = vi.spyOn(only, 'focus');

        const result = handleTabWrapAround(container, only, true);

        expect(result).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
});
