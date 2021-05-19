import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.extensibility.ISelectionId;

import { ITooltipDatum } from './ITooltipDatum';

export const getTooltipIdentity = (datum: ITooltipDatum): [ISelectionId] => {
    const identity = datum?.__identity__;
    return (identity && [<ISelectionId>identity]) || null;
};
