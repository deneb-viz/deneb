/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { copyToClipboard } from '../clipboard';

describe('copyToClipboard', () => {
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let execCommandSpy: ReturnType<typeof vi.spyOn>;
    let capturedTextarea: HTMLTextAreaElement | null;

    beforeEach(() => {
        capturedTextarea = null;
        appendChildSpy = vi
            .spyOn(document.body, 'appendChild')
            .mockImplementation((node) => {
                capturedTextarea = node as HTMLTextAreaElement;
                return node;
            });
        removeChildSpy = vi
            .spyOn(document.body, 'removeChild')
            .mockImplementation((node) => node);
        // jsdom doesn't implement execCommand — define it so we can spy on it
        document.execCommand = vi.fn().mockReturnValue(true);
        execCommandSpy = vi.spyOn(document, 'execCommand');
    });

    it('should create a textarea with the provided text and copy it', () => {
        copyToClipboard('hello world');
        expect(appendChildSpy).toHaveBeenCalledOnce();
        expect(capturedTextarea?.value).toBe('hello world');
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
        expect(removeChildSpy).toHaveBeenCalledOnce();
    });

    it('should handle multi-line text', () => {
        const text = '{\n  "mark": "bar"\n}';
        copyToClipboard(text);
        expect(capturedTextarea?.value).toBe(text);
        expect(execCommandSpy).toHaveBeenCalledWith('copy');
    });
});
