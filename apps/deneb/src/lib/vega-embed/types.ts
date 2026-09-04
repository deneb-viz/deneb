export type LoaderInitializationOptions = {
    host: powerbi.extensibility.visual.IVisualHost;
    translations: LoaderTranslations;
};

type LoaderTranslations = {
    hoverText: string;
    detailedText: string;
};
