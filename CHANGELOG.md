## 0.2.0.81

### Housekeeping

-   Fixed linting issues with chevron icon in header (#17)

## 0.1.0.80

### Improvements

-   Updated Vega-Lite to v5.
-   Dataset has been named back to `dataset` in specifications for consistency with the R/Python visuals.
-   Editor options added to properties pane, with the ability to specify left or right side for the pane.
-   Temporarily disabled features for context and selection, as this needs more work for a wider audience.
    -   Vega-Lite v5 will simplify this, and the previously working code has been updated to work for v5.
    -   However, the generic approach we're taking to add selection and context breaks anything other than a single-layer spec, so this needs more work.
-   Made `canvas` the default renderer for specifications, as it's better for performance and this is Vega's default also.
-   Reduced assistive text size in the New Spec dialog.
-   Made editor min size 350px rather than 325px, as the pivot overflow bug still needs attention.
-   Added scrolling to the template placeholder selection stack.
-   Added Vega-Lite templates:
    -   Simple Bar Char (added tooltip)
    -   Colored Scatterplot
    -   Line Chart with Interval Band
-   Added Vega templates:
    -   Simple Bar Chart
    -   Colored Scatterplot
    -   Line Chart with Interval Band
-   Added feature switch for stripping out external URIs from spec and config. Tried using a loader but this was only successful for data and not images, but I've kept in a stub for this in case we can resolve it correctly in future.
-   Resolved issue with RegEx replace for template placeholders.

### Housekeeping

-   Modified visual metadata to point to the intended final destination for documentation site.
-   Reviewed and cleaned-up translation keys.
-   Centralised MIT licensing details in repo and removed from individual files.
-   Improvements to CSS for editor pane "sidedness".

## 0.1.0.79

### Improvements

-   Fixed issue with template to apply not being reset when provider is changed in the New Spec dialog.
-   Editor key/command binding is now driven via configuration and enumerated in the `CommandService`.
-   Added key bindings for New Spec (Ctrl-Alt-N) and Get Help (Ctrl-Alt-H).
-   All `EditorCommandBar` buttons are now mapped to `CommandService`.
-   Moved methods from `SpecificationService` that were more in-line with UI operations to `CommandService`.

### Housekeeping

-   Removed property menu for VL top-level settings, as it's a massive amount of tech-debt and can be supplued or overridden via config. The templates have been updated with the default font, and the background is `null` to defer to Power BI.
-   Cleaned-up config folder and centralised exports.
-   Templates moved to a `templates` folder and split into separate files. Makes maintenance a bit more onerous but keeps files nice and atomic when we potentially have a lot of templates in there.
-   Removed superfluous imports.
-   Improved documentation of types.
-   Reviewed methods for services to ensure privacy levels are correct:
    -   `CommandService`
    -   `DataLoadingService`
    -   `DataViewService`
    -   `EditorService`
    -   `PropertyService`
    -   `RenderingService`
    -   `SelectionHandlerService`
    -   `SpecificationService`
    -   `TemplateService`
    -   `TooltipHandlerService`
-   Added interface and implementations for:
    -   `CommandService`
    -   `DataLoadingService`
    -   `DataViewService`
    -   `EditorService`
    -   `PropertyService`
    -   `RenderingService`
    -   `SelectionHandlerService`
    -   `SpecificationService`
    -   `TemplateService`
    -   `TooltipHandlerService`

## 0.1.0.78

### Features

-   Added key bindings to editors for:
    -   Apply (Ctrl-Enter)
    -   Toggle Auto-Apply (Ctrl-Shift-Enter)
    -   Repair and Format JSON (Ctrl-Backslash)
-   Initial template placeholder functionality introduced.
    -   We specify the metadata for these at a template level and present dropdowns with all added colums/measures for selection
    -   These are patched in upon creation from the dialog.

### Improvements

-   Modified new dialog to derive its flag from the properties so that its state can
    be persisted across reinitialisations and updates
-   The Create button on the New Spec dialog is now enabled provided that all placeholders (if any) have been fulfilled.
-   Fixed issue with spec being empty text (this will now be cloalesced to `null` and trigger ).
-   Improved horizontal stack space allocation in `TemplatePicker`.

### Housekeeping

-   Refactored services singletons into `services/index`.
-   Refactored common operations into `CommandService`.
-   Removed `setNewDialogVisibility` from `visualReducer`.
-   Removed core d3 from the project, as it's not needed.
-   Trying to document some of the functions as I go, as this is debt that needs to be paid.

## 0.1.0.77

### Housekeeping

-   Fixed linting issues(except for TODOs).
-   Refactored a number of larger components into smaller ones.

## 0.1.0.76

### Improvements

-   `SpecificationError` re-written.
-   `DataFetching` re-written.
-   Nominal scales now use the report theme by default rather than Vega's.
-   Added `formatLocale` and `timeFormatLocale` objects to Vega components for all standard D3 locales.

### Housekeeping

-   Removed all unnecessary CSS
-   Removed dependencies on W3-CSS

## 0.1.0.75

### Improvements

-   Landing page has been re-written.
-   Added instructional mechanism for when data is added but no spec is present.
-   Modified spec parse to factor in `null` (new) spec, so that we can display something nicer than Vega errors when there's nothing to parse

### Housekeeping

-   Removed redundant CSS.
-   Tidied up types for `visualSlice` (`IVisualSliceState`) and refactored config for both slices.

## 0.1.0.74

### Improvements

-   Reinstated Repair JSON, as undo levels were salvagable.
-   Added awareness of allowInteractions, so if we've created interactivity and pinned to a dashboard, then this should work as intended.
-   `EditorService.setText()` works against the ACE Editor instance, in order to preserve undo levels. This means that repar and new template can be undone as long as the editor remains open.
-   Added feature switches and logic for tooltip, context menu and selection (in case we need to disable them for whatever reason).
-   Ensured that landing page is preserved if `dataViewMapping` is invalid - was previously displaying the editor.

### Housekeeping

-   Cleaned-up `RenderingService`.
-   Moved helper functions from `visual` store into the `RenderingService`'.
-   Removed more redundant code (that has been commented out for a while).
-   Removed magic numbers from `VisualRender` for Vega viewport adjustment and made them config constants, with `RenderingService` taking them into account.
-   Removed onerous property defaults and moved them all into `/config/index.ts`.

## 0.1.0.73

### Improvements

-   Improved styling for selected template.
-   Resolved dialog height issue in Desktop (was hard-coded; now calcs).

### Housekeeping

-   Moved CSS imports to ts files.
-   Fixed CSS image imports to use relative URLs rather than base64.
-   Moved all Fluent UI style declarations into `config/styles.ts`.

## 0.1.0.72

### Features

-   Replaced trash icon for rest with a new spec button and workflow, using a modal dialog.
    -   This allows users to choose from some pre-defined templates. Currently we just have some basic blanks, but the foundation is there for something a little more advanced.
    -   The store has a 'template' slice for handling this dialog.
    -   Added setting to store 'dismiss state' of this dialog, as we want it to be present for the first open of the editor, but not subsequently.
    -   SpecificationService deals with persistence of 'new' specs from this dialog into visual settings, and setting of editors.

### Improvements

-   EditorService has a `setText()` method (again).

### Housekeeping

-   Refactored styles for a lot of components into config/styles.ts
-   Removed a lot of redundant CSS for JSONEditor
-   Gradually removing a lot of old dependencies for legacy vega props. Still some to do

## 0.1.0.71

### Features

-   Added de-bouncing to editor (making auto-apply quite a bit more performant)
-   Added search/replace to editor

### Improvements

-   Refactored existing selection ID resolution to use string keys and be compatible with Vega (as it doesn't support objects)

### Housekeeping

-   Removed legacy debug logging from remaining files (and Debugger)
-   Renamed entry point class and files
-   Updated JSONEditor to 9.1.9
-   Swapped out jsoneditor to jsoneditor-minimalist (takes package down from 6 min to 2 min)
-   Removed final dependencies on de-centralised types
-   IEditorProps `role` property renamed to `operation`
-   Cleaned-out lots of redundant code
