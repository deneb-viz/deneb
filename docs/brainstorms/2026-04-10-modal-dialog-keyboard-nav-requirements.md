---
date: 2026-04-10
topic: modal-dialog-keyboard-navigation
---

# Modal Dialog Keyboard Navigation Fix

## Problem Frame

Keyboard users cannot fully navigate the import or export modal dialogs using Tab. In the import dialog, focus gets trapped on the "Create using..." radio group and cannot reach the template selection area. In the export dialog, Tab always returns to the Name field instead of cycling through all interactive elements. These issues make the dialogs inaccessible without a mouse. The editor itself handles tab navigation correctly — only the modal dialogs are affected.

## Requirements

**Import Dialog**
- R1. Tab from the "Create using..." radio group must advance focus to the next interactive zone (template list or spec editor area, depending on the selected create mode)
- R2. The template list should be a single tab stop with arrow key navigation between template cards (custom focus zone, not one tab stop per card)
- R3. Shift+Tab must reverse through the same focus zones

**Export Dialog**
- R4. Tab must cycle through all interactive elements in visual order: Name → Description → Author → Include Preview checkbox → action buttons
- R5. Focus must not return to Name after the last field — it should continue to the checkbox and buttons
- R6. Shift+Tab must reverse through the same sequence

**Version Change Dialog**
- R7. Verify keyboard navigation works correctly in the version change dialog (may already be fine — needs testing)

**General**
- R8. Focus zones within each dialog should follow Fluent UI's focus management patterns (radio groups use arrow keys internally, tab stops move between zones)

## Success Criteria

- All interactive elements in import and export dialogs are reachable via Tab without a mouse
- Tab order matches the visual layout (top-to-bottom, left-to-right within zones)
- No focus traps — Tab always progresses, Shift+Tab always reverses

## Scope Boundaries

- NOT fixing: Remap dialog (no longer displayed)
- NOT fixing: Editor keyboard navigation (already works correctly)
- NOT adding: New keyboard shortcuts or hotkeys within the dialogs

## Key Decisions

- **Custom focus zones over flat tab order:** Template list in the import dialog should be one tab stop with arrow keys inside, not individual tab stops per template card. This matches standard listbox/grid keyboard patterns and keeps tab navigation efficient.

## Outstanding Questions

### Deferred to Planning
- [Affects R2][Technical] How does Fluent UI's Dialog focus trap interact with custom focus zones? May need `tabster` or `FocusZone` configuration.
- [Affects R7][Needs testing] Does the version change dialog have the same issues, or is its content simple enough that default Dialog focus management works?

## Next Steps

-> `/ce:plan` for structured implementation planning
