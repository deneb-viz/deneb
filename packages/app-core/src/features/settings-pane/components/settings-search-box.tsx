import {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
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
 * Imperative handle exposed to parents — lets the `/` hotkey focus
 * the SearchBox without leaking the underlying DOM node or Fluent
 * ref implementation.
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
                setQuery(data.value ?? '');
            },
            [setQuery]
        );

        return (
            <div className={classes.wrapper}>
                <SearchBox
                    ref={inputRef}
                    className={classes.searchBox}
                    value={query}
                    onChange={onChange}
                    placeholder={translate('Text_Settings_Search_Placeholder')}
                    aria-label={translate('Text_Settings_Search_AriaLabel')}
                />
            </div>
        );
    }
);

SettingsSearchBox.displayName = 'SettingsSearchBox';
