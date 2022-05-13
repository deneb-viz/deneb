import * as Vega from 'vega';
import { getState } from '../../store';
import { reactLog } from '../utils/reactLog';
import { getVegaSettings } from '../vega';

/**
 * Custom Vega logger we can use to capture output from a view, into the visual
 * store.
 */
export class StoreVegaLoggerService implements Vega.LoggerInterface {
    level(_: number): this;
    level(): number;
    level(_?: any): number | this {
        if (_ !== undefined) {
            // This is handled via visual props & store
            return this;
        } else {
            return getVegaSettings().logLevel;
        }
    }
    info = (...args: any[]) => {
        if (this.level() >= Vega.Info) {
            reactLog('[DENEB INFO]', args[0]);
            // Currently handle info output manually;
        }
        return this;
    };
    warn = (...args: any[]) => {
        if (this.level() >= Vega.Warn) {
            reactLog('[DENEB WARN]', args[0]);
            getState().recordLogWarn(args[0]);
        }
        return this;
    };
    error = (...args: readonly any[]) => {
        if (this.level() >= Vega.Error) {
            reactLog('[DENEB ERROR]', args[0]);
            getState().recordLogError(args[0]?.message || args[0]);
        }
        return this;
    };
    debug = (...args: any[]) => {
        if (this.level() >= Vega.Debug) {
            reactLog('[DENEB DEBUG]', args[0]);
            // Currently won't log debug output to UI
        }
        return this;
    };
}

/**
 * Custom local Vega logger that we can use to capture output from a spec
 * parse/compile.
 */
export class LocalVegaLoggerService implements Vega.LoggerInterface {
    readonly warns = [];
    readonly infos = [];
    readonly debugs = [];
    #level = 0;
    level(_: number): this;
    level(): number;
    level(_?: number) {
        if (arguments.length) {
            this.#level = +_;
            return this;
        } else {
            return this.#level;
        }
    }
    warn = (...args: any[]) => {
        if (this.#level >= Vega.Warn) {
            this.warns.push(...args);
        }
        return this;
    };
    info = (...args: any[]) => {
        if (this.#level >= Vega.Info) {
            this.infos.push(...args);
        }
        return this;
    };
    debug = (...args: any[]) => {
        if (this.#level >= Vega.Debug) {
            this.debugs.push(...args);
        }
        return this;
    };
    error = (...args: any[]) => {
        throw new Error(...args);
        return this;
    };
}
