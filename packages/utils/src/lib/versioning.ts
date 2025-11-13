/**
 * Structured version information that we can use for comparison or inspection purposes.
 */
export type VersionInformation = {
    denebVersion: string;
    provider: string;
    providerVersion: string;
};

/**
 * Holds both current and previous version information.
 */
export type VersionComparator = {
    current: VersionInformation;
    previous: VersionInformation;
};

/**
 * Denotes type of version change, that we can use for appropriate handling.
 */
export type VersionChangeDirection = 'decrease' | 'equal' | 'increase';
