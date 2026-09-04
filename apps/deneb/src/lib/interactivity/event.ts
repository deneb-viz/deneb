/**
 * Determines whether a mouse event should be interpreted as a potential "multi-select" cross-filter interaction.
 *
 * Returns true when any common multi-select modifier key is held during the event
 * (Ctrl, Shift, or Meta/Command).
 *
 * @param event - The mouse event to evaluate.
 * @returns True if Ctrl, Shift, or Meta (Command on macOS) was pressed; otherwise, false.
 */
export const isPotentialCrossFilterMultiSelectEvent = (event: MouseEvent) => {
    return event.ctrlKey || event.shiftKey || event.metaKey;
};

/**
 *For the supplied event, returns an [x, y] array of mouse coordinates.
 */
export const resolveCoordinates = (event: MouseEvent): [number, number] => [
    event?.clientX,
    event?.clientY
];
