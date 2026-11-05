import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LandingPageLayout } from '../landing-page-layout';
import { useStatusStyles } from '..';

/** The class of the page's content, inside the Fluent provider. */
const contentClass = (html: string) =>
    [...html.matchAll(/<div class="([^"]*)"/g)][1]?.[1];

const renderLayout = (inset?: boolean) =>
    renderToStaticMarkup(
        createElement(LandingPageLayout, {
            version: '1.0.0.0',
            description: 'Description',
            inset,
            children: null
        })
    );

/** The class of a status page's plain content container, rendered on its own. */
const plainContentClass = () =>
    /<div class="([^"]*)"/.exec(
        renderToStaticMarkup(
            createElement(() =>
                createElement('div', {
                    className: useStatusStyles().flexContainerVertical
                })
            )
        )
    )?.[1];

describe('LandingPageLayout', () => {
    // Deneb's landing page has no inset, so this pins its markup.
    it('keeps a plain status container without an inset', () => {
        expect(contentClass(renderLayout())).toBe(plainContentClass());
    });

    it('insets the page content when asked', () => {
        expect(contentClass(renderLayout(true))).not.toBe(plainContentClass());
    });
});
