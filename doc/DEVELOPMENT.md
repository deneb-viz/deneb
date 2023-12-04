# Development Info

_This is a work in progress and I'm trying to flesh this out more for folks who may wish to contribute. If there is anything specific msising that you need to get started, feel free to reach out and I can see if I can help you overcome it (and make a note to prioritize it for the next update of the doc)._

## Feature Flags

Due to the nature of Deneb (being a custom visual), it's not easy to change or redeploy things quickly (due to the publication and review process), but to try to keep branches small and focused so that we don't get too far from the trunk, feature flags are used as much as possible for new development.

[You can read more about the idea of feature flags here](https://www.split.io/blog/manage-feature-flags-javascript/).

### Feature Flag Configuration

Feature flags are stored in `config/features.json` and take the simple form of using the desired feature name as an object key, and a boolean value to represent the state of the feature when merged to the main branch. An example of this is as follows:

```json
{
    "developer_mode": false,
    "combined_apply_button": false,
    "data_drilldown": false,
    "enable_external_uri": false,
    "visual_update_history_overlay": false
}
```

A `.json` file is used because this is easier to swap out when building other packages that might require different configuration (see: _[Feature Flag Overrides](#feature-flag-overrides-for-other-packages)_ below).

### Feature Flag Usage

features are exported as `const FEATURES` in `config/index.ts` and this is the import you should use, e.g.:

```typescript
import { FEATURES } from '../config';

// test for flag and do necessary logic
if (FEATURES.developer_mode) {
    ...
}
```

**Please strive as much as possible to keep feature logic behind flags and tests where you can**. This minimizes issues when merging code to the trunk and ensures ocntinuity of the visual if we are not ready to enable these features yet.

### Feature Flag Maintenance

Unless there is a good reason to keep them, feature flags and their tests should be removed in the next major or minor release (whichever is sooner) after an enabled feature has been included in a certified visual submission to Microsoft and no major issues have been uncovered in production.

As such, this is part of housekeeping work when commencing a new planned update.

### Feature Flag Overrides (for other packages)

In some cases, feature flags will be different to the visual that is submitted for certification to Microsoft. A good example of this is the `enable_external_uri` flag, which prevents loading of external resources if disabled. Certified visuals cannot do this, but the standalone version exists almost purely to allow developers to load content from remote endpoints, on the understanding that the visual isn't certified.

In these cases, feature flag overrides can be applied to `config/package-custom.json` in the `features` object. These will be applied over the top of the configuration in `features.json` whenever the custom package build tasks are run.

You can refer to the `standalone.features` object in this file for an example of what such an override looks like.

### Current Feature Flag Process Limitations

-   For some features, we may need to update the `capabilities.json` file to suit what we want. There currently isn't a process for this, and we will need to come up with a suitable way of modifying this based on a specific flag or its desired behavior.

-   For CI purposes, feature validation is currently done in an ad-hoc manner in `bin/validate-config-for-commit.ts`. We should ideally have a slightly better process for feature whitelisting and validation, but this works _reasonably_ well at present.

## Logging (to Console)

This is a common debugging practice and Deneb has a set of functions to help manage and present this more consistently, found in `src/features/logging`.

The exported `const LOG_LEVEL` in `config/index.ts` drives the behavior of these functions and you can set this level to help with logging output consistently throughout your methods.

### Log Levels

Logging is govered using a number and anything lower than this number if output to the console. Levels are specified in the `ELogLevel` enum, but a more detailed breakdown of their purpose is as follows:

| Level | Name     | Description                                                                                                                                      | Methods                        |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 0     | `None`\* | No logging (mandated for merge to `main`).                                                                                                       | N/A                            |
| 1     | `Error`  | Used for logging error-level events.                                                                                                             | `logError`                     |
| 2     | `Warn`   | Used for logging warning-level events.                                                                                                           | `logWarning`                   |
| 3     | `Info`   | Used for logging info-level events.                                                                                                              | `logInfo`                      |
| 10    | `Host`   | Used for logging events that the Power BI visual host carries out and is intended to help separate this level of the stack from the application. | `logHost`                      |
| 11    | `Render` | Used for logging render events within React components (if wanting to be able to see these as their own type).                                   | `logRender`                    |
| 12    | `Hook`   | Used for logging hook-based logic within React components (if wanting to be able to see these as their own type).                                | `logRender`                    |
| 50    | `Debug`  | Any other verbose logging that does not fit under the above categories.                                                                          | `logDebug`                     |
| 51    | `Timing` | Use a specified identity to start and stop timing, which can help to track performance of methods.                                               | `logTimeStart` \| `logTimeEnd` |

\* We use `None` for the submitted/packaged visual, because if `Error`-level output is logged to the console, this gets scooped up by Microsoft's telemetry and we get notified about it. For trappable errors, we aren't worried about this and it means that if anything occurs that we didn't plan for, this is still captured and sent on for us to look at (when they get around to it).

### Current Logging Process Limitations

-   The standard levels (`Error`, `Warn` and `Info` use their corresponding) levels in the browser console. Everything else goes under the `Verbose` level, so check that you have this enabled if you aren't seeing the expected output in the console.

-   This process can result in methods being less 'pure' and may blur their purpose, so it is reocmmended that you try to balance this as much as possible so that methods are suitably traceable when logging it enabled vs. making them too verbose and therefore hard to understand and maintain.
