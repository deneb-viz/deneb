import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Field, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import { logError } from '@deneb-viz/utils/logging';
import { useDenebState } from '../../../state';

const useErrorStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        gap: tokens.spacingVerticalM
    }
});

type ErrorFallbackProps = {
    onRetry: () => void;
};

const ErrorFallback = ({ onRetry }: ErrorFallbackProps) => {
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useErrorStyles();
    return (
        <div className={classes.container}>
            <Field
                validationMessage={translate('Text_Editor_Error_Message')}
                validationState='error'
            />
            <Button
                appearance='primary'
                icon={<ArrowClockwiseRegular />}
                onClick={onRetry}
            >
                {translate('Text_Editor_Error_Retry')}
            </Button>
        </div>
    );
};

type EditorErrorBoundaryProps = {
    children: ReactNode;
};

type EditorErrorBoundaryState = {
    hasError: boolean;
};

export class EditorErrorBoundary extends Component<
    EditorErrorBoundaryProps,
    EditorErrorBoundaryState
> {
    constructor(props: EditorErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): EditorErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        logError('Editor error:', error, info);
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback onRetry={this.handleRetry} />;
        }
        return this.props.children;
    }
}
