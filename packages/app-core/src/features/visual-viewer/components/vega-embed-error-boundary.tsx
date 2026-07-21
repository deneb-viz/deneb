import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logError } from '@deneb-viz/utils/logging';

interface Props {
    children: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary for VegaEmbed component.
 * Prevents errors in Vega rendering from crashing the entire application.
 *
 * When an error occurs:
 * - Logs the error
 * - Calls optional onError callback
 * - Renders blank (no fallback UI)
 *
 * This boundary wraps `<VegaEmbed>`, which is mounted for BOTH report
 * readers (`app/viewer.tsx`) and the editor's preview area — it is not
 * an editor-only surface. A render-phase throw inside `<VegaEmbed>`
 * (e.g. `patchSpecWithData` in `vega-embed.tsx`, part of the view-init
 * pipeline that runs after compilation succeeds) is exactly the kind of
 * Vega VIEW-INIT failure covered by the 2026-07-15 maintainer sanction
 * on reader-facing failure text (remediation WP8/#8): it must stay
 * blank, matching the standing "readers stay blank on spec errors"
 * policy (see
 * `docs/solutions/design-patterns/viewer-blank-on-spec-error-by-design-2026-07-12.md`).
 * Previously this rendered a "Vega Rendering Error" panel with the raw
 * `error.message` directly to the DOM — visible to report readers, and
 * in violation of the message-hygiene rule (never echo raw
 * exception/data text into reader-facing UI). That panel has been
 * removed in favor of blank.
 *
 * NOTE: wiring `host.displayWarningIcon(...)` for this path (as the
 * sanction allows) needs a generic, localized hover/detail string pair
 * that is accurate for an arbitrary embed-time failure. No existing
 * i18n key fits without being misleading (candidates are either
 * editor-scoped wording or tied to a different failure, e.g. dataset
 * mapping or incremental-update fallback) — flagged for a follow-up
 * decision rather than reusing a poor-fit key or adding a new resjson
 * entry out-of-band.
 */
export class VegaEmbedErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    // React passes the thrown error; it is intentionally not captured —
    // `componentDidCatch` owns logging via its own parameter, and the
    // blank fallback renders nothing that could use it.
    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logError('VegaEmbedErrorBoundary caught error:', {
            error: error.message,
            componentStack: errorInfo.componentStack
        });

        this.props.onError?.(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return null;
        }

        return this.props.children;
    }
}
