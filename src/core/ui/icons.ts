import { getState } from '../../store';
import { zoomConfig } from './dom';

export const isZoomInIconDisabled = (value: number) =>
    value === zoomConfig.max || isZoomControlDisabled();

export const isZoomOutIconDisabled = (value: number) =>
    value === zoomConfig.min || isZoomControlDisabled();

export const isZoomResetIconDisabled = (value: number) =>
    value === zoomConfig.default || isZoomControlDisabled();

const isZoomControlDisabled = () =>
    getState().specification?.status !== 'valid';

export const isZoomControlDisabledReact = () =>
    getState().specification.status !== 'valid';
