import { useEffect, useRef } from 'react';

/**
 * Hook to allows us to store the previous value of component state (e.g., for
 * comparing values in effects).
 */
export const usePrevious = <T>(value: T) => {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};
