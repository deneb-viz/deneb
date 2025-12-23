/**
 * A custom expression that should be added to the Vega view.
 */
export type CustomExpression = {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    method: any;
};

/**
 * Registry of custom expressions.
 */
export type CustomExpressionRegistry = CustomExpression[];
