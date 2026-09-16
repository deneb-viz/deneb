import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installEditorState } from '@deneb-viz/editor';
import './index.css';
import App from './App';

// Merge the editor-only slices into the singleton store before the
// app renders — `App` mounts the editor, whose components throw a
// clear error on first read if the editor slices are missing.
installEditorState();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
