import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { logError } from '@deneb-viz/utils/logging';

interface Props {
    children: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary for VegaEmbed component.
 * Prevents errors in Vega rendering from crashing the entire application.
 *
 * When an error occurs:
 * - Logs the error
 * - Calls optional onError callback
 * - Displays fallback UI
 */
export class VegaEmbedErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
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
            return (
                <div
                    style={{
                        padding: '20px',
                        color: '#d13438',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        overflow: 'auto'
                    }}
                >
                    <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                        Vega Rendering Error
                    </div>
                    <div>
                        {this.state.error?.message ||
                            'An unknown error occurred'}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
