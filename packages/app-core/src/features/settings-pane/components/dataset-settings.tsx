import { useCallback, useMemo, useState } from 'react';
import {
    Button,
    Checkbox,
    InfoLabel,
    Label,
    makeStyles,
    MessageBar,
    MessageBarActions,
    MessageBarBody,
    tokens,
    Tooltip,
    Tree,
    TreeItem,
    TreeItemLayout,
    useId,
    type TreeItemValue,
    type TreeOpenChangeData,
    type TreeOpenChangeEvent
} from '@fluentui/react-components';
import {
    ArrowResetRegular,
    Calculator16Regular,
    TableFreezeColumn16Regular
} from '@fluentui/react-icons';
import FabricTableColumnQuestion16Regular from '@fabric-msft/svg-icons/dist/TableColumnQuestion16Regular';

/**
 * Wrapper for the Fabric SVG icon to match Fluent icon sizing.
 * Fabric icons don't set explicit width/height on the SVG element.
 */
const TableColumnQuestion16Regular = () => (
    <FabricTableColumnQuestion16Regular width={16} height={16} />
);
import {
    resolveFieldDefaults,
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
    computeToggledConfig,
    getApplicableFlags,
    hasAnyEnabledFlag,
    removeFieldFromConfig
} from './dataset-settings-utils';

const useDatasetSettingsStyles = makeStyles({
    tree: {
        paddingLeft: tokens.spacingHorizontalNone
    },
    fieldItem: {
        fontWeight: tokens.fontWeightSemibold
    },
    fieldNameRow: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXS
    },
    enabledFlagHint: {
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: tokens.colorBrandForeground1,
        flexShrink: 0
    },
    roleIcon: {
        display: 'inline-flex',
        alignItems: 'center'
    },
    leafLayout: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS
    }
});

/**
 * Dataset settings component for the settings pane. Renders a Fluent UI Tree
 * showing source dataset fields and their applicable support field toggles.
 * Each leaf renders its own checkbox; there is no field-level bulk toggle.
 */
export const DatasetSettings = () => {
    const classes = useDatasetSettingsStyles();
    const tooltipMountNode = useSettingsPaneTooltip();
    const checkboxIdPrefix = useId('support-field-checkbox');
    const { onEnableCrossHighlight, onDisableCrossHighlight } =
        useDenebPlatformProvider();

    const {
        fields,
        config,
        spec,
        denebMetaVersion,
        interactivity,
        consolidateFieldParameters,
        setConfig,
        translate
    } = useDenebState((state) => ({
        fields: state.dataset.fields,
        config: state.project.supportFieldConfiguration,
        spec: state.project.spec,
        denebMetaVersion: state.project.denebMetaVersion,
        interactivity: state.project.interactivity,
        consolidateFieldParameters: state.project.consolidateFieldParameters,
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

    // A spec is legacy if it has non-default content but denebMetaVersion < 2
    const isLegacy = useMemo(
        () => spec !== PROJECT_DEFAULTS.spec && denebMetaVersion < 2,
        [spec, denebMetaVersion]
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

    const toggleFlag = useCallback(
        (
            fieldName: string,
            flag: keyof SupportFieldFlags,
            checked: boolean
        ): void => {
            const next = computeToggledConfig(
                config,
                resolvedFlags,
                fieldName,
                flag,
                checked
            );
            if (next) setConfig(next);
        },
        [resolvedFlags, config, setConfig]
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
                openItems={openItems}
                onOpenChange={onOpenChange}
            >
                {sourceFields.map(([name, field], fieldIndex) => {
                    const fieldFlags = resolvedFlags[name];
                    const isMeasure =
                        (field.role ?? 'grouping') === 'aggregation';
                    const isFieldParameter = field.role === 'field-parameter';
                    const baseFlags =
                        isMeasure || isFieldParameter
                            ? highlightEnabled
                                ? MEASURE_FLAGS
                                : COLUMN_FLAGS
                            : COLUMN_FLAGS;
                    const isTreatedAs = fieldFlags?.treatAsParameter === true;
                    const isParameter = isFieldParameter || isTreatedAs;
                    const applicableFlags = getApplicableFlags(
                        baseFlags,
                        isFieldParameter,
                        isTreatedAs,
                        isParameter,
                        consolidateFieldParameters
                    );
                    const roleTooltip = translate(
                        isParameter
                            ? 'Text_SupportField_RoleTooltip_Parameter'
                            : isMeasure
                              ? 'Text_SupportField_RoleTooltip_Measure'
                              : 'Text_SupportField_RoleTooltip_Column'
                    );
                    const RoleIcon = isParameter
                        ? TableColumnQuestion16Regular
                        : isMeasure
                          ? Calculator16Regular
                          : TableFreezeColumn16Regular;

                    const isExplicitlyConfigured = name in config;
                    const hasEnabledFlags = hasAnyEnabledFlag(
                        fieldFlags,
                        applicableFlags
                    );

                    const handleReset = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setConfig(removeFieldFromConfig(config, name));
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
                                <span className={classes.fieldNameRow}>
                                    {name}
                                    {hasEnabledFlags && (
                                        <span
                                            className={classes.enabledFlagHint}
                                            aria-hidden='true'
                                        />
                                    )}
                                </span>
                            </TreeItemLayout>
                            <Tree>
                                {applicableFlags.map((flag) => {
                                    const infoKey = FLAG_INFO[flag];
                                    const label = translate(FLAG_LABELS[flag]);
                                    // Index-based id so collisions can't occur for field
                                    // names that differ only by whitespace or punctuation.
                                    const checkboxId = `${checkboxIdPrefix}-${fieldIndex}-${flag}`;
                                    const checked = fieldFlags?.[flag] === true;
                                    return (
                                        <TreeItem
                                            key={flag}
                                            itemType='leaf'
                                            // Opaque identity for Fluent Tree; not decoded anywhere.
                                            value={`${name}/${flag}`}
                                        >
                                            <TreeItemLayout>
                                                <span
                                                    className={
                                                        classes.leafLayout
                                                    }
                                                >
                                                    <Checkbox
                                                        id={checkboxId}
                                                        checked={checked}
                                                        onChange={(_, data) =>
                                                            toggleFlag(
                                                                name,
                                                                flag,
                                                                data.checked ===
                                                                    true
                                                            )
                                                        }
                                                    />
                                                    {infoKey ? (
                                                        <InfoLabel
                                                            htmlFor={checkboxId}
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
                                                        <Label
                                                            htmlFor={checkboxId}
                                                        >
                                                            {label}
                                                        </Label>
                                                    )}
                                                </span>
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
