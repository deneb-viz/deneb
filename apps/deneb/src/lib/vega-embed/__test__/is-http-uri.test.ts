import { describe, expect, it } from 'vitest';
import { isHttpUri } from '../is-http-uri';

describe('isHttpUri (L10 — launchUrl scheme allowlist)', () => {
    it('allows http and https links', () => {
        // eslint-disable-next-line powerbi-visuals/no-http-string -- deliberate scheme-allowlist test input, not a live reference
        expect(isHttpUri('http://example.com')).toBe(true);
        expect(isHttpUri('https://example.com/path?q=1#frag')).toBe(true);
        expect(isHttpUri('HTTPS://EXAMPLE.COM')).toBe(true);
    });

    it('blocks javascript: and other non-web schemes', () => {
        expect(isHttpUri('javascript:alert(1)')).toBe(false);
        expect(isHttpUri('data:text/html,<script>alert(1)</script>')).toBe(
            false
        );
        expect(isHttpUri('file:///etc/passwd')).toBe(false);
        expect(isHttpUri('vbscript:msgbox("x")')).toBe(false);
        expect(isHttpUri('mailto:someone@example.com')).toBe(false);
    });

    it('blocks malformed, relative, and empty URIs', () => {
        expect(isHttpUri('not a url')).toBe(false);
        expect(isHttpUri('/relative/path')).toBe(false);
        expect(isHttpUri('')).toBe(false);
    });
});
