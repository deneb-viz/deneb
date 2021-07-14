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
     * Enables debugger, which is basically a ton of logging. TODO: Remove this as we migrate across
     * to a more functional programming-based approach.
     */
    debug: false
};

/**
 * TODO: doc and figure out if we can token this into the schema somewhere
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
