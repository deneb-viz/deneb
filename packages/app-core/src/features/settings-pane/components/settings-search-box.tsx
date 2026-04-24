import {
    forwardRef,
    startTransition,
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
 * Typing updates a local controlled value synchronously so the caret
 * stays in sync with keystrokes even under load. The store write is
 * routed through React's `startTransition` so the expensive matchView
 * rebuild, HighlightText re-renders, and dataset-tree recomputations
 * happen as a non-urgent transition — React can discard intermediate
 * values and commit only the latest, keeping the input responsive on
 * large datasets. External query changes (`clearQuery`, debug-driven
 * writes) sync back into the local value via `useEffect`.
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
                startTransition(() => {
                    setQuery(next);
                });
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
