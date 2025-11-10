import { useEffect, useRef } from 'react';

/**
 * Hook to allows us to store the previous value of component state (e.g., for
 * comparing values in effects).
 */
export const usePrevious = <T>(value: T): T | undefined => {
    // Initialize ref with the current value so that first render previous is undefined.
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};
