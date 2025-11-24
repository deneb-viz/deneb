import { View } from 'vega';
export interface IVegaViewServices {
    bind: (v: View) => void;
    clearView: () => any;
    doesSignalNameExist: (name: string) => boolean;
    getAllData: () => any;
    getAllSignals: () => any;
    getDataByName: (name: string) => any[];
    getSignalByName: (name: string) => any;
    setSignalByName: (name: string, value: any) => void;
    getView: () => View;
}
