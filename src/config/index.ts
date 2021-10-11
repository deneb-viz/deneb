/**
 * Core configuration that should be referenced by other files
 */
export { exportFieldConstraints, visualFeatures };

/**
 * =======================
 * Visual feature switches
 * =======================
 */
const visualFeatures = {
    /**
     * Enables debugger, which is basically a ton of logging. Issue #27 raised to track removal/migration.
     */
    debug: false
};

/**
 * Issue #128 raised to track figuring out if we can token this into the schema somewhere
 */
const exportFieldConstraints = {
    dataset: {
        name: {
            maxLength: 100
        },
        description: {
            maxLength: 300
        }
    },
    information: {
        name: {
            maxLength: 100
        },
        description: {
            maxLength: 300
        },
        author: {
            maxLength: 100
        }
    }
};
