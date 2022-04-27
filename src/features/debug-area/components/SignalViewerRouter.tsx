import React from 'react';

import { logHasErrors } from '../logging';
import { SignalViewer } from './SignalViewer';
import { ErrorPlaceholder } from './ErrorPlaceholder';

export const SignalViewerRouter: React.FC = () =>
    logHasErrors() ? <ErrorPlaceholder /> : <SignalViewer />;
