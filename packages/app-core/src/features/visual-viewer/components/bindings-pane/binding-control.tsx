import type { CSSProperties } from 'react';
import {
    Checkbox,
    Field,
    Input,
    makeStyles,
    Radio,
    RadioGroup,
    Select,
    Slider,
    tokens
} from '@fluentui/react-components';
import {
    getBindingControlKind,
    getBindingLabel,
    getColorInputValue,
    getInputProperties,
    getInputType,
    getInputValue,
    getOptionAtIndex,
    getOptionLabel,
    getRangeAttributes,
    getSelectedOptionIndex,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';

import { BINDINGS_FIELD_STYLE } from '../../../../lib/interface/bindings-theme';

/**
 * The height Fluent gives a small select, and the least height a small
 * select takes here.
 */
const SMALL_SELECT_HEIGHT = '24px';

const useBindingControlStyles = makeStyles({
    range: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex'
    },
    rangeRailWithoutStepMarks: {
        '::before': {
            backgroundImage: 'none',
            '@media (forced-colors: active)': { backgroundImage: 'none' }
        }
    },
    rangeValue: {
        fontVariantNumeric: 'tabular-nums',
        minWidth: '3ch'
    },
    color: {
        height: '24px',
        width: '40px'
    },
    // Fluent gives a small select a fixed height, which clips its text once
    // the font size setting makes a line taller than the field. Taking that
    // height as a minimum keeps the field as it is at the default size and
    // lets it grow with its text.
    selectGrowingWithText: {
        height: 'auto',
        minHeight: SMALL_SELECT_HEIGHT
    }
});

/**
 * The most steps a slider shows marks for. Fluent draws a mark on the rail at
 * every step, and with more steps than this the marks sit so close together
 * that they cover the rail. Vega's default step gives about a hundred steps.
 */
const MAX_STEP_MARKS = 20;

type BindingControlProps = {
    boundSignal: BoundSignal;
    /** The signal's current value. */
    value: unknown;
    onChange: (boundSignal: BoundSignal, value: unknown) => void;
};

/**
 * One control for one bound signal. Each kind writes the type of value that
 * Vega's own widget writes: a number for a range, a boolean for a checkbox,
 * the option itself for a radio group or select, and text for anything else.
 *
 * Select is used instead of Dropdown because it opens the browser's native
 * list, which is not clipped by the visual's frame and is not mis-scaled by
 * the editor's preview zoom.
 */
export const BindingControl = ({
    boundSignal,
    value,
    onChange
}: BindingControlProps) => {
    const classes = useBindingControlStyles();
    const { bind } = boundSignal;
    const label = getBindingLabel(boundSignal);
    const options = bind.options ?? [];
    const selectedIndex = getSelectedOptionIndex(bind, value);
    const selectedOption = selectedIndex < 0 ? '' : String(selectedIndex);

    switch (getBindingControlKind(bind)) {
        case 'range': {
            const range = getRangeAttributes(bind, value, boundSignal.value);
            const stepCount = (range.max - range.min) / range.step;
            return (
                <Field label={label} size='small'>
                    <div className={classes.range}>
                        <Slider
                            size='small'
                            min={range.min}
                            max={range.max}
                            step={range.step}
                            value={range.value}
                            rail={
                                stepCount > MAX_STEP_MARKS
                                    ? {
                                          className:
                                              classes.rangeRailWithoutStepMarks
                                      }
                                    : undefined
                            }
                            onChange={(_event, data) =>
                                onChange(boundSignal, data.value)
                            }
                        />
                        <span className={classes.rangeValue}>
                            {range.value}
                        </span>
                    </div>
                </Field>
            );
        }
        case 'checkbox':
            return (
                <Checkbox
                    label={label}
                    checked={!!value}
                    onChange={(_event, data) =>
                        onChange(boundSignal, data.checked === true)
                    }
                />
            );
        case 'radio':
            return (
                <Field label={label} size='small'>
                    <RadioGroup
                        layout='horizontal'
                        value={selectedOption}
                        onChange={(_event, data) =>
                            onChange(
                                boundSignal,
                                getOptionAtIndex(bind, data.value)
                            )
                        }
                    >
                        {options.map((_option, index) => (
                            <Radio
                                key={index}
                                value={String(index)}
                                label={getOptionLabel(bind, index)}
                            />
                        ))}
                    </RadioGroup>
                </Field>
            );
        case 'select':
            return (
                <Field label={label} size='small'>
                    <Select
                        size='small'
                        style={BINDINGS_FIELD_STYLE as CSSProperties}
                        select={{ className: classes.selectGrowingWithText }}
                        value={selectedOption}
                        onChange={(_event, data) =>
                            onChange(
                                boundSignal,
                                getOptionAtIndex(bind, data.value)
                            )
                        }
                    >
                        {selectedIndex < 0 && <option value='' />}
                        {options.map((_option, index) => (
                            <option key={index} value={String(index)}>
                                {getOptionLabel(bind, index)}
                            </option>
                        ))}
                    </Select>
                </Field>
            );
        case 'color':
            return (
                <Field label={label} size='small'>
                    {(fieldProps) => (
                        <input
                            {...fieldProps}
                            type='color'
                            className={classes.color}
                            value={getColorInputValue(value)}
                            onChange={(event) =>
                                onChange(boundSignal, event.target.value)
                            }
                        />
                    )}
                </Field>
            );
        default:
            return (
                <Field label={label} size='small'>
                    <Input
                        {...getInputProperties(bind)}
                        size='small'
                        style={BINDINGS_FIELD_STYLE as CSSProperties}
                        type={getInputType(bind)}
                        value={getInputValue(value)}
                        onChange={(_event, data) =>
                            onChange(boundSignal, data.value)
                        }
                    />
                </Field>
            );
    }
};
