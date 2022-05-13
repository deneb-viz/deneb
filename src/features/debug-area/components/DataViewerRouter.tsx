import React from 'react';

import { logHasErrors } from '../logging';
import { DataViewer } from './DataViewer';
import { ErrorPlaceholder } from './ErrorPlaceholder';

export const DataViewerRouter: React.FC = () =>
    logHasErrors() ? <ErrorPlaceholder /> : <DataViewer />;
