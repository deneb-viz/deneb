import { type CompiledSpecification } from './types';

/**
 * Confirms whether the specification is valid. A condition for many commands.
 */
export const isSpecificationValid = (specification: CompiledSpecification) =>
    specification.status === 'valid';
