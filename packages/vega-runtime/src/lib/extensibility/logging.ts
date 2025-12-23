import { logDebug, logInfo } from '@deneb-viz/utils/logging';
import {
    Info as vInfo,
    Warn as vWarn,
    Debug as vDebug,
    Error as vError,
    type LoggerInterface
} from 'vega';

/**
 * Custom local Vega logger that we can use to capture output from a spec parse/compile.
 */
export class LocalVegaLoggerService implements LoggerInterface {
    readonly warns = [];
    readonly infos = [];
    readonly debugs = [];
    #level = 0;
    level(_: number): this;
    level(): number;
    level(_?: number) {
        if (arguments.length && _) {
            this.#level = +_;
            return this;
        } else {
            return this.#level;
        }
    }
    warn = (...args: unknown[]) => {
        if (this.#level >= vWarn) {
            logInfo('[VEGA WARN]', args[0]);
            this.warns.push(...(args as never[]));
        }
        return this;
    };
    info = (...args: unknown[]) => {
        if (this.#level >= vInfo) {
            logInfo('[VEGA INFO]', args[0]);
            this.infos.push(...(args as never[]));
        }
        return this;
    };
    debug = (...args: unknown[]) => {
        if (this.#level >= vDebug) {
            logInfo('[VEGA DEBUG]', args[0]);
            this.debugs.push(...(args as never[]));
        }
        return this;
    };
    error = (...args: unknown[]) => {
        logInfo('[VEGA ERROR]', args[0]);
        throw new Error(...(args as never[]));
    };
}

export class DispatchingVegaLoggerService implements LoggerInterface {
    level(_: number): this;
    level(): number;
    level(_?: number) {
        if (_ !== undefined) {
            return this;
        } else {
            return this._level;
        }
    }
    constructor(
        private _level: number,
        private warningDispatcher: (message: string) => void,
        private errorDispatcher: (message: string) => void
    ) {
        logDebug('DispatchingVegaLoggerService created');
    }
    info = (...args: unknown[]) => {
        if (this.level() >= vInfo) {
            logInfo('[VEGA INFO]', args[0]);
            // Currently handle info output manually;
        }
        return this;
    };
    warn = (...args: unknown[]) => {
        if (this.level() >= vWarn) {
            logInfo('[VEGA WARN]', args[0]);
            this.warningDispatcher(args.map(String).join(' '));
        }
        return this;
    };
    error = (...args: unknown[]) => {
        if (this.level() >= vError) {
            logInfo('[VEGA ERROR]', args[0]);
            this.errorDispatcher(args.map(String).join(' '));
        }
        return this;
    };
    debug = (...args: unknown[]) => {
        if (this.level() >= vDebug) {
            logInfo('[VEGA DEBUG]', args[0]);
            // Currently won't log debug output to UI
        }
        return this;
    };
}
