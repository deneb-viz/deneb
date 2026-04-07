import { describe, expect, it } from 'vitest';
import { getOverlayScrollbarStyles } from '../overlay-styles';

describe('getOverlayScrollbarStyles', () => {
    it('includes overflow: auto', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'red',
            radius: 4,
            width: 8
        });
        expect(result.overflow).toBe('auto');
    });

    it('sets webkit scrollbar width and height from width option', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'red',
            radius: 4,
            width: 12
        });
        expect(result['::-webkit-scrollbar'].width).toBe('12px');
        expect(result['::-webkit-scrollbar'].height).toBe('12px');
    });

    it('sets webkit thumb border-radius from radius option', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'blue',
            radius: 6,
            width: 8
        });
        expect(result['::-webkit-scrollbar-thumb'].borderRadius).toBe('6px');
    });

    it('sets webkit thumb background from thumbColor', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'rgba(0,0,0,0.5)',
            radius: 4,
            width: 8
        });
        expect(result['::-webkit-scrollbar-thumb'].background).toBe(
            'rgba(0,0,0,0.5)'
        );
    });

    it('sets scrollbarColor for Firefox with transparent track', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: '#ff0000',
            radius: 4,
            width: 8
        });
        expect(result.scrollbarColor).toBe('#ff0000 transparent');
    });

    it('sets scrollbarWidth to thin when width <= 8', () => {
        expect(
            getOverlayScrollbarStyles({
                thumbColor: 'red',
                radius: 4,
                width: 8
            }).scrollbarWidth
        ).toBe('thin');
        expect(
            getOverlayScrollbarStyles({
                thumbColor: 'red',
                radius: 4,
                width: 1
            }).scrollbarWidth
        ).toBe('thin');
    });

    it('sets scrollbarWidth to auto when width > 8', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'red',
            radius: 4,
            width: 9
        });
        expect(result.scrollbarWidth).toBe('auto');
    });

    it('accepts a CSS variable string as thumbColor', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'var(--deneb-sb-thumb)',
            radius: 4,
            width: 8
        });
        expect(result['::-webkit-scrollbar-thumb'].background).toBe(
            'var(--deneb-sb-thumb)'
        );
        expect(result.scrollbarColor).toBe('var(--deneb-sb-thumb) transparent');
    });

    it('sets all track and corner backgrounds to transparent', () => {
        const result = getOverlayScrollbarStyles({
            thumbColor: 'red',
            radius: 4,
            width: 8
        });
        expect(result['::-webkit-scrollbar'].background).toBe('transparent');
        expect(result['::-webkit-scrollbar-track'].background).toBe(
            'transparent'
        );
        expect(result['::-webkit-scrollbar-corner'].background).toBe(
            'transparent'
        );
    });
});
