import { DenebApp, DenebProvider, getDenebState } from '@deneb-viz/app-core';

/**
 * Do a simple initialization of our data "outside" app, to validate that we can assign fields.
 * Simulates a dataset being supplied from a host environment.
 *
 * Fields can be defined as:
 * - Simple array: ['a', 'b'] - just field names
 * - Record with metadata: { a: { role: 'grouping', dataType: 'text' } }
 *
 * Fields with `role` and `dataType` are eligible for template operations (export, field tracking).
 * Fields without these properties are available in dropdowns but excluded from template operations.
 */
const { updateDataset } = getDenebState();
updateDataset({
    dataset: {
        // Simple format - just field names as an array
        fields: ['a', 'b'],
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
