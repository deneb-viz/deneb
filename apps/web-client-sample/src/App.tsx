import { DenebApp, DenebProvider, getDenebState } from '@deneb-viz/app-core';

/**
 * Do a simple initialization of our data "outside" app, to validate that we can assign fields. Simulates a dataset
 * being supplied from a host environment.
 *
 * TODO: we will need to add `templateMetadata` as part of processing our host datasets if we want to leverage support
 * export/tokenization properly and this needs to be defined for generic environments as well as handling datasets that
 * don't have this defined (will currently treat it as a generic spec, which may actually be OK for some use cases, but
 * TBD either way).
 */
const { updateDataset } = getDenebState();
updateDataset({
    dataset: {
        fields: {
            a: {
                id: 'a',
                name: 'a'
            },
            b: {
                id: 'b',
                name: 'b'
            }
        },
        values: [
            { a: 'A', b: 28 },
            { a: 'B', b: 55 },
            { a: 'C', b: 43 },
            { a: 'D', b: 91 },
            { a: 'E', b: 81 },
            { a: 'F', b: 53 },
            { a: 'G', b: 19 },
            { a: 'H', b: 87 },
            { a: 'I', b: 52 }
        ]
    }
});

function App() {
    return (
        <DenebProvider>
            <DenebApp type='editor' />
        </DenebProvider>
    );
}

export default App;
