import React, { useContext, useState } from 'react';

import { getConfig } from '../core/utils/config';

export const zoomConfig = getConfig().zoomLevel;

interface IZoomLevelContext {
    level: number;
    setLevel: (level: React.SetStateAction<number>) => void;
    hotkeysBound: boolean;
    setHotkeysBound: (value: boolean) => void;
}

export const ZoomLevelContext = React.createContext<
    IZoomLevelContext | undefined
>(undefined);

export const ZoomLevelProvider: React.FC<{}> = ({ children }) => {
    const [level, setLevel] = useState(zoomConfig.default),
        [hotkeysBound, setHotkeysBound] = React.useState(false);
    return (
        <ZoomLevelContext.Provider
            value={{ level, setLevel, hotkeysBound, setHotkeysBound }}
        >
            {children}
        </ZoomLevelContext.Provider>
    );
};

/**
 * React hook for handling zoom level in components.
 */
export const useZoomLevel = () => useContext(ZoomLevelContext);

export const getDefaultZoomLevel = () => zoomConfig.default;

/**
 * Manages the increase of zoom level in the visual editor by increasing it by step value.
 */
export const getZoomInLevel = (value: number) => {
    const { step, max } = zoomConfig,
        level = Math.min(max, Math.floor((value + step) / 10) * 10);
    return (value < max && level) || level;
};

/**
 * Manages the decrease of zoom level in the visual editor by decreasing it by step value.
 */
export const getZoomOutLevel = (value: number) => {
    const { step, min } = zoomConfig,
        level = Math.max(min, Math.ceil((value - step) / 10) * 10);
    return (value > min && level) || level;
};
