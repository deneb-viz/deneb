/**
 * Static schema describing a single row within a flat (non-dataset)
 * section. Schemas hold i18n keys only — no resolved strings — so they
 * can be module-scope constants and remain locale-agnostic.
 */
export type SectionRowSchema = {
    /** Stable row id (kebab-case). Used as the key in `SectionMatchView.rows`. */
    id: string;
    /** i18n key whose translation is the row's primary label. */
    labelKey: string;
    /**
     * Optional i18n key whose translation is the row's assistive /
     * info-label text. Omit when the row has no secondary text.
     */
    assistiveKey?: string;
};

/**
 * Static schema describing a single flat section in the settings pane.
 *
 * `id` is a plain string — section ids are opaque to the match engine and
 * platform contributions can register arbitrary ids (see
 * `resolvePlatformSearchables`). The dataset section is modelled via a
 * separate descriptor shape, not via a union member here.
 */
export type SectionSchema = {
    id: string;
    headingKey: string;
    rows: readonly SectionRowSchema[];
};
