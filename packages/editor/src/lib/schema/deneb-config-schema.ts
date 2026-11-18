import {
    BINDINGS_ORIENT_VALUES,
    DEFAULT_BINDINGS_SETTINGS
} from '@deneb-viz/vega-runtime/spec-processing';

/**
 * What a colour setting accepts. The parser of the settings refuses anything
 * else, because a colour is written into a stylesheet as text.
 */
const COLOR_NOTE =
    'A hex value, a colour name, or one colour function with plain values, for example `#0078d4` or `rgba(0, 0, 0, 0.5)`. `var()`, `url()`, `color-mix()`, `currentcolor`, and keywords such as `inherit` and `unset`, are not accepted.';

/**
 * JSON schema for the `deneb` key of a config document, for completion,
 * hover documentation and underlines in the config editor. The values are
 * validated when the spec is parsed, by `extractBindingsSettings`, and this
 * schema describes what that function accepts: a setting added there needs
 * adding here.
 */
export const DENEB_CONFIG_SCHEMA = {
    type: 'object',
    description:
        'Settings for Deneb itself. Vega and Vega-Lite never see this key.',
    additionalProperties: false,
    properties: {
        bindings: {
            type: 'object',
            description:
                'The pane of controls for the signals and parameters that have a `bind` property. An invalid value falls back to its default, with a warning in the log.',
            additionalProperties: false,
            properties: {
                orient: {
                    enum: [...BINDINGS_ORIENT_VALUES],
                    default: DEFAULT_BINDINGS_SETTINGS.orient,
                    description: 'The edge of the visual the pane sits on.'
                },
                float: {
                    type: 'boolean',
                    default: DEFAULT_BINDINGS_SETTINGS.float,
                    description:
                        'Overlay the chart instead of taking space beside it.'
                },
                collapsible: {
                    type: 'boolean',
                    default: DEFAULT_BINDINGS_SETTINGS.collapsible,
                    description:
                        'Show the control that collapses and expands the pane.'
                },
                collapsed: {
                    type: 'boolean',
                    default: DEFAULT_BINDINGS_SETTINGS.collapsed,
                    description:
                        'Start with the pane collapsed. Applies only when `collapsible` is true.'
                },
                maxSize: {
                    type: 'number',
                    exclusiveMinimum: 0,
                    maximum: 1,
                    default: DEFAULT_BINDINGS_SETTINGS.maxSize,
                    description:
                        'The most of the visual the pane takes, as a share greater than 0 and no more than 1: of its height when the pane is on the top or bottom, and of its width on the left or right. The pane scrolls beyond it.'
                },
                fontFamily: {
                    type: 'string',
                    description:
                        'Font for the text in the pane: one or more font names separated by commas, for example `Segoe UI, sans-serif`. A name may have letters, digits, spaces, hyphens and underscores, and may be in quotes.'
                },
                fontSize: {
                    type: 'number',
                    minimum: 1,
                    maximum: 100,
                    description:
                        'Size of the text in the pane, in pixels, from 1 to 100.'
                },
                color: {
                    type: 'string',
                    description: `Colour of the text in the pane and of the collapse control. Text inside a dropdown or a text input keeps the theme colour. ${COLOR_NOTE}`
                },
                accentColor: {
                    type: 'string',
                    description: `Colour of slider fills, checked states and the focus indicator. ${COLOR_NOTE}`
                },
                background: {
                    type: 'string',
                    description: `Pane background. Transparent by default, or white when the pane floats. An alpha value gives opacity. ${COLOR_NOTE}`
                },
                borderColor: {
                    type: 'string',
                    description: `Colour of the line between the pane and the chart. Use \`transparent\` to hide it. ${COLOR_NOTE}`
                }
            }
        }
    }
};
