// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    FOCUS_YIELD_SELECTOR,
    getTabbableElements,
    handleTabWrapAround,
    shouldYieldToFocusScope,
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

describe('FOCUS_YIELD_SELECTOR', () => {
    it('should match [role="dialog"] elements', () => {
        const container = createContainer({
            tag: 'div',
            attrs: { role: 'dialog' }
        });
        expect(container.querySelector(FOCUS_YIELD_SELECTOR)).not.toBeNull();
    });

    it('should match [role="alertdialog"] elements', () => {
        const container = createContainer({
            tag: 'div',
            attrs: { role: 'alertdialog' }
        });
        expect(container.querySelector(FOCUS_YIELD_SELECTOR)).not.toBeNull();
    });

    it('should match .fui-PopoverSurface elements', () => {
        const container = createContainer({
            tag: 'div',
            attrs: { class: 'fui-PopoverSurface', role: 'note' }
        });
        expect(container.querySelector(FOCUS_YIELD_SELECTOR)).not.toBeNull();
    });

    it('should not match unrelated elements', () => {
        const container = createContainer(
            { tag: 'div', attrs: { role: 'note' } },
            { tag: 'div', attrs: { class: 'some-other-class' } },
            { tag: 'button', text: 'Click' }
        );
        expect(container.querySelector(FOCUS_YIELD_SELECTOR)).toBeNull();
    });
});

describe('shouldYieldToFocusScope', () => {
    it('should return false when no overlay is present', () => {
        createContainer(
            { tag: 'input', attrs: { type: 'text' } },
            { tag: 'button', text: 'Click' }
        );
        expect(shouldYieldToFocusScope()).toBe(false);
    });

    it('should return true when a [role="dialog"] is present', () => {
        createContainer({ tag: 'div', attrs: { role: 'dialog' } });
        expect(shouldYieldToFocusScope()).toBe(true);
    });

    it('should return true when a [role="alertdialog"] is present', () => {
        createContainer({ tag: 'div', attrs: { role: 'alertdialog' } });
        expect(shouldYieldToFocusScope()).toBe(true);
    });

    it('should return true when a Fluent UI PopoverSurface is present', () => {
        // Fluent UI v9 PopoverSurface renders with role="note" and the
        // `fui-PopoverSurface` stable class; detection relies on the class.
        createContainer({
            tag: 'div',
            attrs: { class: 'fui-PopoverSurface', role: 'note' }
        });
        expect(shouldYieldToFocusScope()).toBe(true);
    });

    it('should return true when both a dialog and a PopoverSurface are present', () => {
        createContainer(
            { tag: 'div', attrs: { role: 'dialog' } },
            { tag: 'div', attrs: { class: 'fui-PopoverSurface' } }
        );
        expect(shouldYieldToFocusScope()).toBe(true);
    });

    it('should accept a custom Document for testability', () => {
        // Sanity-check the injected-document hook used by the production
        // caller — passing the real document explicitly should behave the
        // same as the default argument.
        createContainer({ tag: 'div', attrs: { class: 'fui-PopoverSurface' } });
        expect(shouldYieldToFocusScope(document)).toBe(true);
    });
});

describe('bindTabCycling early-return integration', () => {
    // These tests exercise the same decision the document-level Tab
    // interceptor (`bindTabCycling` in src/index.ts) performs: yield when an
    // overlay with its own focus management is present, otherwise wrap focus
    // via handleTabWrapAround. Testing the composition guards against
    // regressing the dialog fix or the PopoverSurface extension.
    it('yields Tab (no wrap) when a PopoverSurface is in the DOM', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } },
            { tag: 'div', attrs: { class: 'fui-PopoverSurface' } }
        );
        const first = container.querySelector<HTMLElement>('#first')!;
        const focusSpy = vi.spyOn(first, 'focus');

        // Simulate the guard in bindTabCycling: if shouldYieldToFocusScope
        // returns true, do not invoke handleTabWrapAround at all.
        let wrapped = false;
        if (!shouldYieldToFocusScope()) {
            wrapped = handleTabWrapAround(container, document.body, false);
        }

        expect(wrapped).toBe(false);
        expect(focusSpy).not.toHaveBeenCalled();
    });

    it('wraps Tab as before when no overlay is present', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } }
        );
        const last = container.querySelector<HTMLElement>('#last')!;
        const first = container.querySelector<HTMLElement>('#first')!;
        const focusSpy = vi.spyOn(first, 'focus');

        let wrapped = false;
        if (!shouldYieldToFocusScope()) {
            wrapped = handleTabWrapAround(container, last, false);
        }

        expect(wrapped).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('yields when both a dialog and a PopoverSurface are present', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } },
            { tag: 'div', attrs: { role: 'dialog' } },
            { tag: 'div', attrs: { class: 'fui-PopoverSurface' } }
        );
        const first = container.querySelector<HTMLElement>('#first')!;
        const focusSpy = vi.spyOn(first, 'focus');

        let wrapped = false;
        if (!shouldYieldToFocusScope()) {
            wrapped = handleTabWrapAround(container, document.body, false);
        }

        expect(wrapped).toBe(false);
        expect(focusSpy).not.toHaveBeenCalled();
    });

    it('yields when only a dialog is present (regression: existing behaviour preserved)', () => {
        const container = createContainer(
            { tag: 'input', attrs: { id: 'first' } },
            { tag: 'input', attrs: { id: 'last' } },
            { tag: 'div', attrs: { role: 'dialog' } }
        );
        const first = container.querySelector<HTMLElement>('#first')!;
        const focusSpy = vi.spyOn(first, 'focus');

        let wrapped = false;
        if (!shouldYieldToFocusScope()) {
            wrapped = handleTabWrapAround(container, document.body, false);
        }

        expect(wrapped).toBe(false);
        expect(focusSpy).not.toHaveBeenCalled();
    });
});
