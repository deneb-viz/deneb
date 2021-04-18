import { visualFeatures } from './config';
import {
    TDebugMethodMarkerExtent,
    IDebugLogOptions,
    IDebugProfileDetail
} from './types';

/**
 * Used to handle debugging, if enabled within the visual settings
 */
class DebuggerManager {
    // Indicates whether debugger is enabled (set by properties)
    private enabled: boolean = visualFeatures.debug;
    // Profiling info
    private profiling: IDebugProfileDetail[] = [];

    /**
     * Clears the console if debugging is enabled
     */
    clear() {
        if (this.enabled) {
            console.clear();
            this.profiling = [];
        }
    }

    /**
     * Create a heading within the browser console, if debugging is enabled
     * @param heading Text to display in the heading
     */
    heading(heading: string) {
        if (this.enabled) {
            console.log(
                `\n====================\n${heading}\n====================`
            );
        }
    }

    /**
     * Create a footer if debugging is enabled, allowing you to demark sections within the console
     */
    footer() {
        if (this.enabled) {
            console.log(`====================`);
        }
    }

    /**
     * Write out the supplied args to the console, with tabbing
     * @param args Any items to output, separated by a comma, like for `console.log()`
     */
    log(...args: any[]) {
        if (this.enabled) {
            console.log(...args);
        }
    }

    /**
     * Used to start or end a group within the console for a method.
     * @param name - name to display in the console for the group.
     * @param extent - specify whether to start or end a group.
     */
    methodMarker(name: string, extent: TDebugMethodMarkerExtent) {
        if (this.enabled) {
            switch (extent) {
                case 'start': {
                    console.group(name);
                    return;
                }
                case 'end': {
                    console.groupEnd();
                    return;
                }
            }
        }
    }

    addProfiling(
        methodName: string,
        owner: string,
        start: number,
        finish: number
    ) {
        if (this.enabled) {
            this.profiling.push({
                owner,
                methodName,
                duration: finish - start
            });
        }
    }

    profileReport() {
        if (this.enabled) {
            this.heading('Profiling Report');
            console.table(this.profiling);
            this.footer();
            this.profiling = [];
        }
    }
}

const Debugger = new DebuggerManager();

function standardLog(options?: IDebugLogOptions) {
    return (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) => {
        const targetMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            const start = options?.profile && performance.now();
            Debugger.methodMarker(propertyKey, 'start');
            const result = targetMethod.apply(this, args),
                finish = options?.profile && performance.now();
            options?.profile &&
                Debugger.addProfiling(
                    propertyKey,
                    options?.owner,
                    start,
                    finish
                );
            Debugger.methodMarker(propertyKey, 'end');
            options?.report && Debugger.profileReport();
            return result;
        };
        return descriptor;
    };
}

export default Debugger;
export { standardLog };
