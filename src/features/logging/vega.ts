import * as Vega from 'vega';
import { getState } from '../../store';
import { getVegaSettings } from '../../core/vega';
import { logInfo } from '.';

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
            return getVegaSettings().logging.logLevel.value as number;
        }
    }
    info = (...args: any[]) => {
        if (this.level() >= Vega.Info) {
            logInfo('[VEGA INFO]', args[0]);
            // Currently handle info output manually;
        }
        return this;
    };
    warn = (...args: any[]) => {
        if (this.level() >= Vega.Warn) {
            logInfo('[VEGA WARN]', args[0]);
            getState().specification.logWarn(args[0]);
        }
        return this;
    };
    error = (...args: readonly any[]) => {
        if (this.level() >= Vega.Error) {
            logInfo('[VEGA ERROR]', args[0]);
            getState().specification.logError(args[0]?.message || args[0]);
        }
        return this;
    };
    debug = (...args: any[]) => {
        if (this.level() >= Vega.Debug) {
            logInfo('[VEGA DEBUG]', args[0]);
            // Currently won't log debug output to UI
        }
        return this;
    };
}
