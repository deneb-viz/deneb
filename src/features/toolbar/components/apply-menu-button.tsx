import React, { useCallback, useMemo, useState } from 'react';
import {
    Menu,
    MenuButtonProps,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    SplitButton,
    Tooltip
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store from '../../../store';
import { PlayRegular, ReplayRegular } from '@fluentui/react-icons';
import { useToolbarStyles } from '.';
import { handleApply } from '../../../core/ui/commands';
import { TooltipCustomMount } from '../../interface';

export const ApplyMenuButton: React.FC = () => {
    const { applyMode, updateApplyMode } = store(
        (state) => ({
            applyMode: state.editor.applyMode,
            updateApplyMode: state.editor.updateApplyMode
        }),
        shallow
    );
    const manualIcon = useMemo(() => <PlayRegular />, []);
    const autoIcon = useMemo(() => <ReplayRegular />, []);
    const applyIcon = useMemo(
        () => (applyMode === 'Manual' ? manualIcon : autoIcon),
        [applyMode]
    );
    const onClick = useCallback(() => {
        handleApply();
    }, []);
    const onAutoSelect = useCallback(() => {
        handleApply();
        updateApplyMode('Auto');
    }, []);
    const onManualSelect = useCallback(() => {
        handleApply();
        updateApplyMode('Manual');
    }, []);
    const classes = useToolbarStyles();
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <div>
            <Menu hasIcons positioning='below-end' inline>
                <MenuTrigger>
                    {(triggerProps: MenuButtonProps) => (
                        <>
                            <Tooltip
                                content={getI18nValue(
                                    'Text_Tooltip_Button_Apply'
                                )}
                                relationship='label'
                                positioning={'after'}
                                withArrow
                                mountNode={ref}
                            >
                                <SplitButton
                                    className={classes.menuButtonApply}
                                    primaryActionButton={{ onClick }}
                                    menuButton={triggerProps}
                                    icon={applyIcon}
                                >
                                    {getI18nValue(
                                        `Text_Button_Apply_${applyMode}`
                                    )}
                                </SplitButton>
                            </Tooltip>
                            <TooltipCustomMount setRef={setRef} />
                        </>
                    )}
                </MenuTrigger>
                <MenuPopover className={classes.menuButtonApplyList}>
                    <MenuList>
                        <MenuItem
                            icon={manualIcon}
                            disabled={applyMode === 'Manual'}
                            onClick={onManualSelect}
                        >
                            {getI18nValue('Text_Menu_Apply_Manual')}
                        </MenuItem>
                        <MenuItem
                            icon={autoIcon}
                            disabled={applyMode === 'Auto'}
                            onClick={onAutoSelect}
                        >
                            {getI18nValue('Text_Menu_Apply_Auto')}
                        </MenuItem>
                    </MenuList>
                </MenuPopover>
            </Menu>
        </div>
    );
};
