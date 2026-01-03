/**
 * Indicates the type of selection mode that is currently active.
 * `simple` = legacy selection mode (let Deneb do it for me);
 * `advanced` = advanced selection mode (let me do it for Deneb).
 * @remarks consider that these may be moved as we determine how to handle interactivity mode generally.
 */
export type SelectionMode = 'simple' | 'advanced';
