import type { CSSProperties } from 'react';
import {
    Checkbox,
    Field,
    Input,
    makeStyles,
    mergeClasses,
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

/** The width of a slider where its row has room for it. */
const SLIDER_WIDTH = '120px';

/**
 * Moves a checkbox or a radio group back by the space that is left around
 * its box or circle, so that it starts where the other controls start.
 */
const INDICATOR_OFFSET = `calc(-1 * ${tokens.spacingHorizontalXS})`;

const useBindingControlStyles = makeStyles({
    // A control never asks for more width than its row has. One with a long
    // option, or in a large font, shrinks to fit instead of pushing its row
    // out of the pane.
    row: { '> *': { minWidth: 0 } },
    // Beside its control, a label is level with it, whatever the height of
    // either. Fluent's own rows keep the two level only for a control of the
    // usual height at the usual font size, so the field is one row here, with
    // both centred in it.
    rowWithLabelBeside: { alignItems: 'center', gridTemplateRows: 'auto' },
    // A word too long for the space wraps instead of running out of the pane.
    label: { overflowWrap: 'anywhere' },
    // Fluent surrounds the box of a checkbox and the circle of a radio button
    // with space of its own. With less of it, a row of either is as tall as
    // any other row, and each sits as near to its label as any other control.
    indicator: {
        marginBottom: tokens.spacingVerticalXS,
        marginLeft: tokens.spacingHorizontalXS,
        marginRight: tokens.spacingHorizontalXS,
        marginTop: tokens.spacingVerticalXS
    },
    checkbox: { marginLeft: INDICATOR_OFFSET },
    radios: { flexWrap: 'wrap', marginLeft: INDICATOR_OFFSET },
    radioLabel: {
        paddingBottom: tokens.spacingVerticalXS,
        paddingTop: tokens.spacingVerticalXS
    },
    range: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex'
    },
    // Fluent gives a slider a least width, which a narrow pane cannot always
    // spare. As its width instead, the slider is the same size wherever there
    // is room, and gives way where there is not.
    rangeSlider: { flexShrink: 1, minWidth: 0, width: SLIDER_WIDTH },
    rangeRailWithoutStepMarks: {
        '::before': {
            backgroundImage: 'none',
            '@media (forced-colors: active)': { backgroundImage: 'none' }
        }
    },
    // Shown at the size of the labels, as the rest of the text in a row is.
    rangeValue: {
        flexShrink: 0,
        fontSize: tokens.fontSizeBase200,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: tokens.lineHeightBase200,
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
    /** Whether each label sits beside its control or above it. */
    fieldOrientation: 'horizontal' | 'vertical';
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
    fieldOrientation,
    onChange
}: BindingControlProps) => {
    const classes = useBindingControlStyles();
    const { bind } = boundSignal;
    const label = getBindingLabel(boundSignal);
    const options = bind.options ?? [];
    const selectedIndex = getSelectedOptionIndex(bind, value);
    const selectedOption = selectedIndex < 0 ? '' : String(selectedIndex);
    // Every kind of control is named by a field label, the checkbox
    // included, so that every row of the pane reads the same way.
    const field = {
        className: mergeClasses(
            classes.row,
            fieldOrientation === 'horizontal' && classes.rowWithLabelBeside
        ),
        label: { children: label, className: classes.label },
        orientation: fieldOrientation,
        size: 'small'
    } as const;

    switch (getBindingControlKind(bind)) {
        case 'range': {
            const range = getRangeAttributes(bind, value, boundSignal.value);
            const stepCount = (range.max - range.min) / range.step;
            return (
                <Field {...field}>
                    <div className={classes.range}>
                        <Slider
                            className={classes.rangeSlider}
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
                <Field {...field}>
                    <Checkbox
                        className={classes.checkbox}
                        indicator={{ className: classes.indicator }}
                        checked={!!value}
                        onChange={(_event, data) =>
                            onChange(boundSignal, data.checked === true)
                        }
                    />
                </Field>
            );
        case 'radio':
            return (
                <Field {...field}>
                    <RadioGroup
                        className={classes.radios}
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
                                indicator={{ className: classes.indicator }}
                                label={{
                                    children: getOptionLabel(bind, index),
                                    className: classes.radioLabel,
                                    size: 'small'
                                }}
                            />
                        ))}
                    </RadioGroup>
                </Field>
            );
        case 'select':
            return (
                <Field {...field}>
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
                <Field {...field}>
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
                <Field {...field}>
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
