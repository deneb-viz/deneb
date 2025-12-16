export type LoaderInitializationOptions = {
    launchUrl: (url: string) => void;
    translations: LoaderTranslations;
};

type LoaderTranslations = {
    hoverText: string;
    detailedText: string;
};
