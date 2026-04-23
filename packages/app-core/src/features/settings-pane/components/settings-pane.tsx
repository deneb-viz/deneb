import { isValidElement, useCallback, useMemo, useRef, useState } from 'react';
import {
    Accordion,
    type AccordionToggleData,
    type AccordionToggleEvent,
    makeStyles
} from '@fluentui/react-components';

import {
    ProviderSettings,
    RenderModeSettings,
    ScaleToZoomSettings
} from './general-settings';
import { PerformanceSettings } from './performance-settings';
import { DatasetSettings } from './dataset-settings';
import { SettingsAccordionItem } from './settings-accordion-item';
import { SettingsPaneTooltipProvider } from './settings-pane-tooltip-context';
import {
    SettingsSearchBox,
    type SettingsSearchBoxHandle
} from './settings-search-box';
import { SettingsEmptyState } from './settings-empty-state';
import { SettingsPaneContextMenu } from './settings-pane-context-menu';
import { HighlightText } from './highlight-text';
import { useDenebPlatformProvider } from '../../../components/deneb-platform';
import { useDenebState } from '../../../state';
import { buildMatchView } from '../search/match-engine';
import {
    resolvePlatformSearchables,
    resolveQuery,
    resolveSectionSchema
} from '../search/resolve-descriptors';
import { buildResolvedDatasetDescriptor } from '../search/dataset-indexer';
import { generalSchema } from '../search/general-schema';
import { performanceSchema } from '../search/performance-schema';
import { computeVisibleSectionIds } from '../search/compute-visible-section-ids';
import type { MatchView, SectionMatchView } from '../search/types';
import { useFocusSearchShortcut } from '../hooks/use-focus-search-shortcut';
import { useFocusRecovery } from '../hooks/use-focus-recovery';
import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

const DEFAULT_OPEN_ITEMS: string[] = [];

/** Memoize open items across remounts (module-level ref). */
let persistedOpenItems: string[] | null = null;

const useSettingsPaneLayoutStyles = makeStyles({
    root: {
        overflow: 'overlay',
        width: '100%'
    }
});

/** Pick the `SectionMatchView` for a given flat section, or `null`. */
const pickSectionView = (
    view: MatchView,
    id: string
): SectionMatchView | null => view.sections.get(id) ?? null;

/**
 * Extract the React `key` prop of a platform-supplied AccordionItem
 * element. Platforms render each platform section as a standalone
 * element whose `key` matches the AccordionItem's `value` — we rely on
 * that invariant to associate elements with their
 * `PlatformSearchContribution`.
 */
const getElementKey = (element: unknown): string | null => {
    if (!isValidElement(element)) return null;
    return typeof element.key === 'string' ? element.key : null;
};

export const SettingsPane = () => {
    const classes = useSettingsPaneLayoutStyles();
    const {
        settingsPaneFooter,
        settingsPanePlatformComponent,
        settingsPanePlatformSearchable
    } = useDenebPlatformProvider();
    const {
        translate,
        query,
        datasetFields,
        supportFieldConfiguration,
        spec,
        denebMetaVersion,
        interactivity,
        consolidateFieldParameters
    } = useDenebState((state) => ({
        translate: state.i18n.translate,
        query: state.settingsPane.query,
        datasetFields: state.dataset.fields,
        supportFieldConfiguration: state.project.supportFieldConfiguration,
        spec: state.project.spec,
        denebMetaVersion: state.project.denebMetaVersion,
        interactivity: state.project.interactivity,
        consolidateFieldParameters: state.project.consolidateFieldParameters
    }));
    const [openItems, setOpenItems] = useState<string[]>(
        () => persistedOpenItems ?? DEFAULT_OPEN_ITEMS
    );
    const onToggle = useCallback(
        (_event: AccordionToggleEvent, data: AccordionToggleData<string>) => {
            const items = data.openItems;
            setOpenItems(items);
            persistedOpenItems = items;
        },
        []
    );
    const searchBoxRef = useRef<SettingsSearchBoxHandle>(null);
    const paneRootRef = useRef<HTMLDivElement>(null);

    // Context menu local state (R5). Menu is callback-driven — the Zustand
    // slice stays out of this. `anchorRect` anchors Fluent's positioning via
    // a virtual element.
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);

    // Resolve schemas + platform contribution + dataset descriptor,
    // then run the match engine. The dataset indexer mirrors the
    // render-time logic in DatasetSettings so match results line up
    // with what the tree actually shows.
    const matchView = useMemo<MatchView>(() => {
        const resolvedSections = [
            resolveSectionSchema(generalSchema, translate),
            resolveSectionSchema(performanceSchema, translate)
        ];
        // Each platform contribution resolves to its own sibling section
        // descriptor. The contribution's `id` flows through verbatim and
        // must match the React `key` of the corresponding injected
        // AccordionItem (see `getElementKey`).
        const resolvedPlatform = resolvePlatformSearchables(
            settingsPanePlatformSearchable,
            translate
        );
        resolvedSections.push(...resolvedPlatform);

        const sourceFields = Object.entries(datasetFields).filter(
            ([, f]) => f?.isSupportField !== true
        );
        const highlightEnabled = interactivity?.highlight ?? false;
        const effectiveMetaVersion = denebMetaVersion ?? 0;
        const isLegacy =
            spec !== PROJECT_DEFAULTS.spec && effectiveMetaVersion < 2;
        const datasetDescriptor = buildResolvedDatasetDescriptor({
            sourceFields,
            config: supportFieldConfiguration ?? {},
            masterSettings: {
                crossHighlightEnabled: highlightEnabled,
                crossFilterEnabled: interactivity?.selection ?? false
            },
            isLegacy,
            highlightEnabled,
            consolidateFieldParameters: consolidateFieldParameters ?? true,
            translate,
            headingKey: 'Text_Settings_Dataset'
        });
        return buildMatchView({
            query: resolveQuery(query),
            sections: resolvedSections,
            dataset: datasetDescriptor
        });
    }, [
        query,
        translate,
        settingsPanePlatformSearchable,
        datasetFields,
        supportFieldConfiguration,
        spec,
        denebMetaVersion,
        interactivity,
        consolidateFieldParameters
    ]);

    // Platform elements are a heterogeneous list of sibling
    // AccordionItems. Each element's React `key` is taken as its section
    // id — `registeredPlatformIds` are those that have a matching
    // `PlatformSearchContribution` (participate in search);
    // `alwaysVisiblePlatformIds` are the rest (legacy always-visible
    // fallback preserved for platforms that haven't opted in yet).
    const platformSectionIds = useMemo<string[]>(() => {
        const ids: string[] = [];
        for (const element of settingsPanePlatformComponent ?? []) {
            const key = getElementKey(element);
            if (key !== null) ids.push(key);
        }
        return ids;
    }, [settingsPanePlatformComponent]);
    const registeredPlatformIds = useMemo<string[]>(
        () => (settingsPanePlatformSearchable ?? []).map((c) => c.id),
        [settingsPanePlatformSearchable]
    );
    const alwaysVisiblePlatformIds = useMemo<string[]>(() => {
        const registered = new Set(registeredPlatformIds);
        return platformSectionIds.filter((id) => !registered.has(id));
    }, [platformSectionIds, registeredPlatformIds]);

    // Accordion: when a query is active, the chevrons become read-only
    // and openItems is derived from the match view so matched sections
    // auto-expand. Always-visible platform elements (no searchable
    // contribution registered) are force-included so they stay on-screen.
    const isSearching = query.trim().length > 0;
    const effectiveOpenItems = useMemo<string[]>(() => {
        if (!isSearching) return openItems;
        const items = Array.from(matchView.matchedSections);
        for (const id of alwaysVisiblePlatformIds) {
            if (!items.includes(id)) items.push(id);
        }
        return items;
    }, [isSearching, openItems, matchView, alwaysVisiblePlatformIds]);
    const effectiveOnToggle = isSearching ? undefined : onToggle;

    // Context menu handlers. "Expand all" is filter-aware via
    // `computeVisibleSectionIds` — during an active search it expands only
    // currently-visible sections. Both handlers mutate the pane's local
    // `openItems` state (and its persistence ref) without touching the
    // Zustand slice.
    const handleExpandAll = useCallback(() => {
        const ids = computeVisibleSectionIds({
            query,
            matchedSections: matchView.matchedSections,
            platformSectionIds,
            registeredPlatformIds
        });
        setOpenItems(ids);
        persistedOpenItems = ids;
    }, [query, matchView, platformSectionIds, registeredPlatformIds]);
    const handleCollapseAll = useCallback(() => {
        setOpenItems([]);
        persistedOpenItems = [];
    }, []);

    // Right-click: open menu anchored at the pointer.
    const handleContextMenu = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            const rect = new DOMRect(event.clientX, event.clientY, 1, 1);
            setMenuAnchor(rect);
            setMenuOpen(true);
        },
        []
    );
    // Keyboard equivalent: Shift+F10 / ContextMenu key. Anchor at the
    // focused element's bounding rect, or the pane root as a fallback.
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            const isShiftF10 = event.shiftKey && event.key === 'F10';
            const isContextMenuKey = event.key === 'ContextMenu';
            if (!isShiftF10 && !isContextMenuKey) return;
            event.preventDefault();
            const active =
                (document.activeElement as HTMLElement | null) ??
                paneRootRef.current;
            const rect =
                active?.getBoundingClientRect() ?? new DOMRect(0, 0, 1, 1);
            setMenuAnchor(rect);
            setMenuOpen(true);
        },
        []
    );

    // Focus recovery — when the focused row vanishes, return focus to
    // the SearchBox.
    useFocusRecovery(matchView, searchBoxRef);

    // `/` shortcut: focus SearchBox from anywhere outside a text-entry
    // surface. Enabled whenever the settings pane is mounted.
    useFocusSearchShortcut(searchBoxRef, true);

    const generalView = pickSectionView(matchView, 'general');
    const performanceView = pickSectionView(matchView, 'performance');

    // When searching, sections not in `matchedSections` disappear from
    // the accordion entirely. Each injected platform element is filtered
    // independently based on its React `key`: it renders when either the
    // match engine shortlisted it (registered + matched) or it is an
    // unregistered element (always-visible fallback).
    const showGeneral =
        !isSearching || matchView.matchedSections.has('general');
    const showPerformance =
        !isSearching || matchView.matchedSections.has('performance');
    const showDataset =
        !isSearching || matchView.matchedSections.has('dataset');
    const registeredPlatformIdSet = useMemo(
        () => new Set(registeredPlatformIds),
        [registeredPlatformIds]
    );
    // Platform-section heading highlighting: when a registered platform
    // section matches on its heading, we *would* like to wrap the heading
    // text in <HighlightText>. However, platform components render their
    // own SettingsAccordionItem internally — the pane only sees an
    // opaque JSX.Element and can't inject a `highlightedHeading` prop
    // without cloneElement gymnastics. Matching a heading still
    // shortlists the section; the heading text itself just renders
    // without the mark for now. Future iteration: surface a data
    // attribute / cloneElement pass to paint highlights into the
    // platform-owned heading.
    const visiblePlatformElements = isSearching
        ? (settingsPanePlatformComponent ?? []).filter((element) => {
              const key = getElementKey(element);
              if (key === null) return true; // render unkeyed siblings defensively
              if (matchView.matchedSections.has(key)) return true;
              // Unregistered (opted out of search) → always-visible.
              return !registeredPlatformIdSet.has(key);
          })
        : (settingsPanePlatformComponent ?? []);

    const generalHeading = translate('Text_Vega_Provider_And_Rendering');
    const performanceHeading = translate('Text_Vega_Performance');
    const datasetHeading = translate('Text_Settings_Dataset');

    // Empty state: shown only when the active query produces zero matches
    // AND no always-visible platform element is mounted (those would
    // otherwise remain on-screen and make the "no results" message
    // misleading).
    const emptyResults =
        isSearching &&
        matchView.matchedSections.size === 0 &&
        alwaysVisiblePlatformIds.length === 0;

    return (
        <SettingsPaneTooltipProvider>
            <div
                ref={paneRootRef}
                className={classes.root}
                onContextMenu={handleContextMenu}
                onKeyDown={handleKeyDown}
            >
                <SettingsSearchBox ref={searchBoxRef} />
                {emptyResults ? (
                    <SettingsEmptyState query={query} />
                ) : (
                    <Accordion
                        multiple
                        collapsible
                        openItems={effectiveOpenItems}
                        onToggle={effectiveOnToggle}
                    >
                        {showGeneral ? (
                            <div data-settings-section-id='general'>
                                <SettingsAccordionItem
                                    value='general'
                                    heading={generalHeading}
                                    highlightedHeading={
                                        generalView?.headingHighlights ? (
                                            <HighlightText
                                                text={generalHeading}
                                                ranges={
                                                    generalView.headingHighlights
                                                }
                                            />
                                        ) : undefined
                                    }
                                >
                                    <ProviderSettings
                                        sectionMatchView={generalView}
                                    />
                                    <RenderModeSettings
                                        sectionMatchView={generalView}
                                    />
                                    <ScaleToZoomSettings
                                        sectionMatchView={generalView}
                                    />
                                </SettingsAccordionItem>
                            </div>
                        ) : null}
                        {showPerformance ? (
                            <div data-settings-section-id='performance'>
                                <SettingsAccordionItem
                                    value='performance'
                                    heading={performanceHeading}
                                    highlightedHeading={
                                        performanceView?.headingHighlights ? (
                                            <HighlightText
                                                text={performanceHeading}
                                                ranges={
                                                    performanceView.headingHighlights
                                                }
                                            />
                                        ) : undefined
                                    }
                                >
                                    <PerformanceSettings
                                        sectionMatchView={performanceView}
                                    />
                                </SettingsAccordionItem>
                            </div>
                        ) : null}
                        {showDataset ? (
                            <SettingsAccordionItem
                                value='dataset'
                                heading={datasetHeading}
                                highlightedHeading={
                                    matchView.datasetTree?.headingHighlights ? (
                                        <HighlightText
                                            text={datasetHeading}
                                            ranges={
                                                matchView.datasetTree
                                                    .headingHighlights
                                            }
                                        />
                                    ) : undefined
                                }
                            >
                                <DatasetSettings
                                    datasetMatchView={matchView.datasetTree}
                                />
                            </SettingsAccordionItem>
                        ) : null}
                        {visiblePlatformElements}
                    </Accordion>
                )}
                <SettingsPaneContextMenu
                    open={menuOpen}
                    anchorRect={menuAnchor}
                    onOpenChange={setMenuOpen}
                    onExpandAll={handleExpandAll}
                    onCollapseAll={handleCollapseAll}
                    translate={translate}
                />
                {settingsPaneFooter}
            </div>
        </SettingsPaneTooltipProvider>
    );
};
