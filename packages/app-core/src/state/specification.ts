import { type CompiledSpecification } from '@deneb-viz/json-processing/spec-processing';

export type SpecificationSliceProperties = CompiledSpecification & {
    /**
     * Clear all current errors and warnings.
     */
    clearLog: () => void;
    /**
     * Record a new error message into the current array of errors.
     */
    logError: (error: string) => void;
    /**
     * Record a new warning message into the current array of warnings.
     */
    logWarn: (warn: string) => void;
    /**
     * Set the current specification and parse results.
     */
    setSpecificationParseResults: (spec: CompiledSpecification) => void;
};

export type SpecificationSlice = {
    specification: SpecificationSliceProperties;
};
