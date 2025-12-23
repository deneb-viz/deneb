import { makeStyles } from '@fluentui/react-components';
import React from 'react';
import { POPOVER_Z_INDEX } from '../../lib/interface';

type TooltipCustomMountProps = {
    setRef: (instance: HTMLDivElement | null) => void;
};

export const tooltipCustomMountStyles = makeStyles({
    root: {
        zIndex: POPOVER_Z_INDEX
    }
});

/**
 * This provides a generic div that can be used as custom tooltip mount, in conjunction with a state setter for the ref
 * from the parent component.
 * @privateRemarks
 * In Fluent UI 9.20.0, a change was introduced that renders <tooltips/popovers etc. in a different DOM node than the
 * one they were previously mounted to. This creates some issues with the UI, so we need to attach tooltips to a custom
 * mount node. An implementation example can be found in the Fluent UI doc here:
 * https://react.fluentui.dev/?path=/docs/components-tooltip--default#custom-mount
 * TODO: fix this, as it can work if the UI is set up correctly.
 */
export const TooltipCustomMount = ({ setRef }: TooltipCustomMountProps) => {
    const classes = tooltipCustomMountStyles();
    return <div ref={setRef} className={classes.root} />;
};
