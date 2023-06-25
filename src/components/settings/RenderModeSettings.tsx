import * as React from 'react';
import {
    ChoiceGroup,
    IChoiceGroupOption
} from '@fluentui/react/lib/ChoiceGroup';
import {
    Dropdown,
    IDropdownStyles,
    IDropdownOption
} from '@fluentui/react/lib/Dropdown';

import { choiceGroupStyles, choiceItemStyles } from '../elements';
import store from '../../store';
import { updateRenderMode, updateSvgFilter } from '../../core/ui/commands';
import { TSpecRenderMode } from '../../core/vega';
import { Paragraph } from '../elements/Typography';
import {
    getSvgFilterAsDropdownList,
    isFilterEnabled
} from '../../core/ui/svgFilter';
import { getI18nValue } from '../../features/i18n';

const dropdownStyles: Partial<IDropdownStyles> = {
    root: {
        width: 125
    }
};

const RenderModeSettings = () => {
    const { vega, display } = store((state) => state.visualSettings);
    const handleRenderMode = React.useCallback(
        (ev: React.SyntheticEvent<HTMLElement>, option: IChoiceGroupOption) => {
            updateRenderMode(option.key as TSpecRenderMode);
        },
        []
    );
    const handleSvgFilter = React.useCallback(
        (ev: React.SyntheticEvent<HTMLElement>, option: IDropdownOption) => {
            updateSvgFilter(option.key as string);
        },
        []
    );
    const rendererOptions: IChoiceGroupOption[] = [
        {
            key: 'canvas',
            text: getI18nValue('Enum_Grammar_RenderMode_Canvas'),
            styles: choiceItemStyles
        },
        {
            key: 'svg',
            text: getI18nValue('Enum_Grammar_RenderMode_Svg'),
            styles: choiceItemStyles
        }
    ];
    return (
        <>
            <ChoiceGroup
                options={rendererOptions}
                styles={choiceGroupStyles}
                onChange={handleRenderMode}
                selectedKey={vega.renderMode}
                label={getI18nValue('Objects_Vega_RenderMode')}
            />
            <Paragraph>{getI18nValue('Assistive_Text_RenderMode')}</Paragraph>
            {isFilterEnabled() ? (
                <Dropdown
                    label={getI18nValue('Objects_Display_SVGFilter')}
                    options={getSvgFilterAsDropdownList()}
                    styles={dropdownStyles}
                    selectedKey={display.svgFilter}
                    onChange={handleSvgFilter}
                />
            ) : (
                <></>
            )}
        </>
    );
};

export default RenderModeSettings;
