import type powerbi from 'powerbi-visuals-api';
import { type formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

// A mixin's base constructor has to accept any arguments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SliceClass = new (...args: any[]) => formattingSettings.SimpleSlice;

/**
 * Binds a format pane slice to its own capabilities object.
 *
 * The formatting model utilities read, write and reset every slice on its
 * card's object. A slice made from the returned class uses `objectName`
 * instead, so one card can group settings stored on different objects. The
 * property itself stays where capabilities declare it, so saved reports and
 * templates are unaffected.
 */
export const onObject = <T extends SliceClass>(Slice: T, objectName: string) =>
    class extends Slice {
        readonly objectName = objectName;

        getFormattingSlice(
            _cardObjectName: string,
            localizationManager?: powerbi.extensibility.ILocalizationManager
        ) {
            return super.getFormattingSlice(objectName, localizationManager);
        }

        // Both methods also receive the card's object name, which they
        // ignore, so it is left out of their parameters.
        getRevertToDefaultDescriptor() {
            return super.getRevertToDefaultDescriptor(objectName);
        }

        setPropertiesValues(dataViewObjects: powerbi.DataViewObjects) {
            super.setPropertiesValues(dataViewObjects, objectName);
        }
    };
