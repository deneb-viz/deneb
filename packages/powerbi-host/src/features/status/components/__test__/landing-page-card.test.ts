import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LandingPageCard, type LandingPageStep } from '../landing-page-card';
import { useStatusStyles } from '..';

const renderCard = (step?: LandingPageStep, action?: ReactNode) =>
    renderToStaticMarkup(
        createElement(LandingPageCard, {
            i18nHeader: 'Heading',
            image: null,
            step,
            action
        })
    );

const sectionClass = (html: string) =>
    /<section class="([^"]*)"/.exec(html)?.[1];

/** The class of a status page's plain card section, rendered on its own. */
const plainSectionClass = () =>
    sectionClass(
        renderToStaticMarkup(
            createElement(() =>
                createElement('section', {
                    className: useStatusStyles().cardSection
                })
            )
        )
    );

const DONE_ACTION = 'fui-CardHeader__action';

describe('LandingPageCard', () => {
    // Deneb's landing page uses cards without a step, so this pins its markup.
    it('renders a card without a step as a plain card section, with no step markup', () => {
        const html = renderCard();
        expect(sectionClass(html)).toBe(plainSectionClass());
        expect(html).not.toContain('aria-current');
        expect(html).not.toContain(DONE_ACTION);
    });

    it('marks the current step as current and highlights it', () => {
        const html = renderCard('current');
        expect(html).toContain('aria-current="step"');
        expect(sectionClass(html)).not.toBe(plainSectionClass());
    });

    it.each(['done', 'upcoming'] as LandingPageStep[])(
        'leaves a %s step unhighlighted and not marked as current',
        (step) => {
            const html = renderCard(step);
            expect(html).not.toContain('aria-current');
            expect(sectionClass(html)).toBe(plainSectionClass());
        }
    );

    it('shows Done on a done step only', () => {
        expect(renderCard('done')).toContain(DONE_ACTION);
        for (const step of [undefined, 'current', 'upcoming'] as const) {
            expect(renderCard(step)).not.toContain(DONE_ACTION);
        }
    });

    it('shows its action in the heading row, unless the step is done', () => {
        const action = createElement('button', null, 'Act');
        expect(renderCard('current', action)).toMatch(
            /fui-CardHeader__action[^>]*><button>Act<\/button>/
        );
        expect(renderCard('done', action)).not.toContain(
            '<button>Act</button>'
        );
    });
});
