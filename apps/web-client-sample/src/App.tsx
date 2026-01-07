import { DenebApp, DenebProvider } from '@deneb-viz/app-core';

function App() {
    return (
        <DenebProvider>
            <DenebApp type='editor' />
        </DenebProvider>
    );
}

export default App;
