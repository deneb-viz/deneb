import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type ChangeEvent
} from 'react';
import {
    SearchBox,
    type SearchBoxChangeEvent,
    type InputOnChangeData,
    makeStyles,
    tokens
} from '@fluentui/react-components';

import { useDenebState } from '../../../state';

/**
 * Imperative handle exposed to parents — lets any focus-source (e.g. the
 * focus-recovery layout effect) focus the SearchBox without leaking the
 * underlying DOM node or Fluent ref implementation.
 */
export type SettingsSearchBoxHandle = {
    focus: () => void;
};

const useStyles = makeStyles({
    wrapper: {
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`,
        backgroundColor: tokens.colorNeutralBackground1
    },
    searchBox: {
        width: '100%'
    }
});

/**
 * Search box rendered above the settings-pane accordion. Bound to the
 * session-scoped query slice (`state.settingsPane.query`).
 *
 * Typing updates a local controlled value synchronously so the caret stays
 * in sync with keystrokes even under load, and writes straight through to
 * the store on every change. The write used to be wrapped in React's
 * `startTransition`, on the theory that it would let React defer the
 * expensive matchView rebuild as a non-urgent update — but the store is a
 * Zustand slice consumed via `useSyncExternalStore`
 * (`state.settingsPane.query` in `settings-pane.tsx`), and
 * `useSyncExternalStore` subscriptions always apply synchronously
 * regardless of the transition/priority the triggering update ran under;
 * `startTransition` had no effect here and only obscured the actual fix
 * (see `settings-pane.tsx`, which now defers the expensive match-view
 * recompute itself via `useDeferredValue`). External query changes
 * (`clearQuery`, debug-driven writes) sync back into the local value via
 * `useEffect`.
 */
export const SettingsSearchBox = forwardRef<SettingsSearchBoxHandle>(
    (_props, ref) => {
        const classes = useStyles();
        const { query, setQuery, translate } = useDenebState((state) => ({
            query: state.settingsPane.query,
            setQuery: state.settingsPane.setQuery,
            translate: state.i18n.translate
        }));
        const inputRef = useRef<HTMLInputElement>(null);
        const [localValue, setLocalValue] = useState(query);

        // Sync local value when the store-side query changes from a
        // source other than typing (e.g. programmatic clear).
        useEffect(() => {
            setLocalValue(query);
        }, [query]);

        useImperativeHandle(
            ref,
            () => ({
                focus: () => inputRef.current?.focus()
            }),
            []
        );

        const onChange = useCallback(
            (
                _event: SearchBoxChangeEvent | ChangeEvent<HTMLInputElement>,
                data: InputOnChangeData
            ) => {
                const next = data.value ?? '';
                setLocalValue(next);
                setQuery(next);
            },
            [setQuery]
        );

        return (
            <div className={classes.wrapper}>
                <SearchBox
                    ref={inputRef}
                    className={classes.searchBox}
                    value={localValue}
                    onChange={onChange}
                    placeholder={translate('Text_Settings_Search_Placeholder')}
                    aria-label={translate('Text_Settings_Search_AriaLabel')}
                />
            </div>
        );
    }
);

SettingsSearchBox.displayName = 'SettingsSearchBox';
