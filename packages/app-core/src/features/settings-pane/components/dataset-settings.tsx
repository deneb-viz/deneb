import { useCallback, useMemo, useState } from 'react';
import {
    Button,
    InfoLabel,
    makeStyles,
    MessageBar,
    MessageBarActions,
    MessageBarBody,
    tokens,
    Tooltip,
    Tree,
    TreeItem,
    TreeItemLayout,
    type TreeItemValue,
    type TreeCheckedChangeData,
    type TreeCheckedChangeEvent,
    type TreeOpenChangeData,
    type TreeOpenChangeEvent
} from '@fluentui/react-components';
import {
    ArrowResetRegular,
    Calculator16Regular,
    TableFreezeColumn16Regular
} from '@fluentui/react-icons';
import {
    resolveFieldDefaults,
    type SupportFieldConfiguration,
    type SupportFieldFlags
} from '@deneb-viz/data-core/support-fields';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';
import { useDenebState } from '../../../state';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useSettingsPaneTooltip } from './settings-pane-tooltip-context';
import {
    MEASURE_FLAGS,
    COLUMN_FLAGS,
    FLAG_LABELS,
    FLAG_INFO,
    VALUE_SEPARATOR,
    encodeValue,
    decodeValue
} from './dataset-settings-utils';

const useDatasetSettingsStyles = makeStyles({
    tree: {
        paddingLeft: tokens.spacingHorizontalNone
    },
    fieldItem: {
        fontWeight: tokens.fontWeightSemibold
    },
    asideContainer: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXS
    },
    roleIcon: {
        display: 'inline-flex',
        alignItems: 'center'
    }
});

/**
 * Dataset settings component for the settings pane. Renders a Fluent UI Tree
 * with checkbox selection showing source dataset fields and their applicable
 * support field toggles.
 */
export const DatasetSettings = () => {
    const classes = useDatasetSettingsStyles();
    const tooltipMountNode = useSettingsPaneTooltip();
    const { onEnableCrossHighlight, onDisableCrossHighlight } =
        useDenebPlatformProvider();

    const { fields, config, spec, interactivity, setConfig, translate } =
        useDenebState((state) => ({
            fields: state.dataset.fields,
            config: state.project.supportFieldConfiguration,
            spec: state.project.spec,
            interactivity: state.project.interactivity,
            setConfig: state.project.setSupportFieldConfiguration,
            translate: state.i18n.translate
        }));

    // Filter to source fields only (exclude support/derived fields)
    const sourceFields = useMemo(
        () =>
            Object.entries(fields).filter(
                ([, f]) => f?.isSupportField !== true
            ),
        [fields]
    );

    // Open/collapse state for field tree nodes — collapsed by default
    const [openItems, setOpenItems] = useState<Set<TreeItemValue>>(
        () => new Set()
    );
    const onOpenChange = useCallback(
        (_event: TreeOpenChangeEvent, data: TreeOpenChangeData) => {
            setOpenItems(data.openItems);
        },
        []
    );

    const highlightEnabled = interactivity?.highlight ?? false;

    // Master settings for default resolution
    const masterSettings = useMemo(
        () => ({
            crossHighlightEnabled: highlightEnabled,
            crossFilterEnabled: interactivity?.selection ?? false
        }),
        [highlightEnabled, interactivity?.selection]
    );

    const hasMeasures = useMemo(
        () =>
            sourceFields.some(
                ([, f]) => (f.role ?? 'grouping') === 'aggregation'
            ),
        [sourceFields]
    );

    // A spec is legacy if it has non-default content but no support field config persisted
    const isLegacy = useMemo(
        () =>
            spec !== PROJECT_DEFAULTS.spec && Object.keys(config).length === 0,
        [spec, config]
    );

    // Resolve flags for each source field (explicit config or defaults).
    // Returns a record keyed by field name.
    const resolvedFlags = useMemo(() => {
        const result: Record<string, SupportFieldFlags> = {};
        for (const [name, field] of sourceFields) {
            const explicit = config[name];
            if (explicit) {
                result[name] = explicit;
            } else {
                result[name] = resolveFieldDefaults({
                    masterSettings,
                    fieldRole: field.role ?? 'grouping',
                    isLegacy
                });
            }
        }
        return result;
    }, [sourceFields, config, masterSettings, isLegacy]);

    // Build the checkedItems Map for the Tree (includes parent node state)
    const checkedItems = useMemo(() => {
        const map = new Map<TreeItemValue, 'mixed' | boolean>();
        for (const [name, field] of sourceFields) {
            const flags = resolvedFlags[name];
            const isMeasure = (field.role ?? 'grouping') === 'aggregation';
            const applicableFlags =
                isMeasure && highlightEnabled ? MEASURE_FLAGS : COLUMN_FLAGS;
            let checkedCount = 0;
            for (const flag of applicableFlags) {
                if (flags[flag]) {
                    map.set(encodeValue(name, flag), true);
                    checkedCount++;
                }
            }
            // Parent node: all checked, some checked (mixed), or none (absent)
            if (checkedCount === applicableFlags.length) {
                map.set(name, true);
            } else if (checkedCount > 0) {
                map.set(name, 'mixed');
            }
        }
        return map;
    }, [sourceFields, resolvedFlags]);

    // Handle checkbox toggle — supports both parent (field) and leaf (flag) nodes
    const onCheckedChange = useCallback(
        (_event: TreeCheckedChangeEvent, data: TreeCheckedChangeData): void => {
            const value = data.value as string;
            const isParent = !value.includes(VALUE_SEPARATOR);

            if (isParent) {
                // Parent node: toggle all applicable flags for this field
                const fieldName = value;
                const currentFlags = resolvedFlags[fieldName];
                if (!currentFlags) return;

                const field = sourceFields.find(([n]) => n === fieldName);
                if (!field) return;
                const isMeasure =
                    (field[1].role ?? 'grouping') === 'aggregation';
                const applicableFlags =
                    isMeasure && highlightEnabled
                        ? MEASURE_FLAGS
                        : COLUMN_FLAGS;

                const newChecked = data.checked === true;
                const updatedFlags = { ...currentFlags };
                for (const flag of applicableFlags) {
                    updatedFlags[flag] = newChecked;
                }

                const updatedConfig: SupportFieldConfiguration = {
                    ...config,
                    [fieldName]: updatedFlags
                };
                setConfig(updatedConfig);
            } else {
                // Leaf node: toggle a single flag
                const [fieldName, flagKey] = decodeValue(value);

                const currentFlags = resolvedFlags[fieldName];
                if (!currentFlags) return;

                const isCurrentlyChecked = data.checked === true;
                const updatedFlags: SupportFieldFlags = {
                    ...currentFlags,
                    [flagKey]: isCurrentlyChecked
                };

                const updatedConfig: SupportFieldConfiguration = {
                    ...config,
                    [fieldName]: updatedFlags
                };
                setConfig(updatedConfig);
            }
        },
        [highlightEnabled, resolvedFlags, config, setConfig, sourceFields]
    );

    // Determine Case 2: highlight enabled but no measure fields have any
    // highlight flags selected
    const showNoHighlightFieldsWarning = useMemo(() => {
        if (!highlightEnabled) return false;
        const measureFields = sourceFields.filter(
            ([, f]) => (f.role ?? 'grouping') === 'aggregation'
        );
        if (measureFields.length === 0) return false;
        return measureFields.every(([name]) => {
            const flags = resolvedFlags[name];
            return (
                !flags.highlight &&
                !flags.highlightStatus &&
                !flags.highlightComparator
            );
        });
    }, [highlightEnabled, sourceFields, resolvedFlags]);

    return (
        <>
            <Tree
                className={classes.tree}
                aria-label={translate('Text_Settings_Dataset')}
                checkedItems={checkedItems}
                onCheckedChange={onCheckedChange}
                openItems={openItems}
                onOpenChange={onOpenChange}
                selectionMode='multiselect'
            >
                {sourceFields.map(([name, field]) => {
                    const isMeasure =
                        (field.role ?? 'grouping') === 'aggregation';
                    const applicableFlags = isMeasure
                        ? highlightEnabled
                            ? MEASURE_FLAGS
                            : COLUMN_FLAGS
                        : COLUMN_FLAGS;
                    const roleTooltip = translate(
                        isMeasure
                            ? 'Text_SupportField_RoleTooltip_Measure'
                            : 'Text_SupportField_RoleTooltip_Column'
                    );
                    const RoleIcon = isMeasure
                        ? Calculator16Regular
                        : TableFreezeColumn16Regular;

                    const isExplicitlyConfigured = name in config;

                    const handleReset = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        const { [name]: _, ...rest } = config;
                        setConfig(rest);
                    };

                    return (
                        <TreeItem key={name} itemType='branch' value={name}>
                            <TreeItemLayout
                                className={classes.fieldItem}
                                iconBefore={
                                    <Tooltip
                                        content={roleTooltip}
                                        relationship='label'
                                        withArrow
                                        mountNode={tooltipMountNode}
                                    >
                                        <span className={classes.roleIcon}>
                                            <RoleIcon />
                                        </span>
                                    </Tooltip>
                                }
                                aside={
                                    <Tooltip
                                        content={translate(
                                            'Tooltip_Setting_Reset'
                                        )}
                                        relationship='label'
                                        withArrow
                                        mountNode={tooltipMountNode}
                                    >
                                        <Button
                                            icon={<ArrowResetRegular />}
                                            appearance='subtle'
                                            size='small'
                                            onClick={handleReset}
                                            disabled={!isExplicitlyConfigured}
                                        />
                                    </Tooltip>
                                }
                            >
                                {name}
                            </TreeItemLayout>
                            <Tree>
                                {applicableFlags.map((flag) => {
                                    const infoKey = FLAG_INFO[flag];
                                    const label = translate(FLAG_LABELS[flag]);
                                    return (
                                        <TreeItem
                                            key={flag}
                                            itemType='leaf'
                                            value={encodeValue(name, flag)}
                                        >
                                            <TreeItemLayout>
                                                {infoKey ? (
                                                    <InfoLabel
                                                        info={translate(
                                                            infoKey
                                                        )}
                                                        infoButton={{
                                                            inline: false,
                                                            popover: {
                                                                mountNode:
                                                                    tooltipMountNode
                                                            },
                                                            onClick: (e) =>
                                                                e.stopPropagation()
                                                        }}
                                                    >
                                                        {label}
                                                    </InfoLabel>
                                                ) : (
                                                    label
                                                )}
                                            </TreeItemLayout>
                                        </TreeItem>
                                    );
                                })}
                            </Tree>
                        </TreeItem>
                    );
                })}
            </Tree>
            {/* Case 1: Cross-highlighting disabled — only show if measures exist */}
            {!highlightEnabled && hasMeasures && (
                <MessageBar shape='rounded' intent='info'>
                    <MessageBarBody>
                        {translate('Text_MessageBar_CrossHighlightDisabled')}
                    </MessageBarBody>
                    {onEnableCrossHighlight && (
                        <MessageBarActions>
                            <Button
                                appearance='transparent'
                                size='small'
                                onClick={onEnableCrossHighlight}
                            >
                                {translate(
                                    'Text_MessageBar_CrossHighlightDisabled_Action'
                                )}
                            </Button>
                        </MessageBarActions>
                    )}
                </MessageBar>
            )}
            {/* Case 2: Highlight on but no highlight fields selected */}
            {highlightEnabled && showNoHighlightFieldsWarning && (
                <MessageBar shape='rounded' intent='warning'>
                    <MessageBarBody>
                        {translate('Text_MessageBar_NoHighlightFields')}
                    </MessageBarBody>
                    {onDisableCrossHighlight && (
                        <MessageBarActions>
                            <Button
                                appearance='transparent'
                                size='small'
                                onClick={onDisableCrossHighlight}
                            >
                                {translate(
                                    'Text_MessageBar_NoHighlightFields_Action'
                                )}
                            </Button>
                        </MessageBarActions>
                    )}
                </MessageBar>
            )}
        </>
    );
};
