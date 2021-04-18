import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;

import * as React from 'react';
import { useSelector } from 'react-redux';
import { Stack, Text, Separator } from 'office-ui-fabric-react';

import Debugger from '../../Debugger';
import {
    landingVisualNameStyles,
    landingVisualDescriptionStyles,
    landingVerticalStackStyles,
    landingVerticalStackItemStyles,
    landingHorizontalSeparatorStyles,
    landingVerticalInnerStackTokens,
    landingVerticalOuterStackTokens,
    landingVerticalStackOuterStyles
} from '../../config/styles';
import { state } from '../../store';

const NewVisualPlaceholder = () => {
    Debugger.log('Rendering component: [NewVisualPlaceholder]');
    const root = useSelector(state),
        { editMode, i18n } = root.visual,
        resolveDataInstruction = () => {
            switch (true) {
                case editMode === EditMode.Advanced: {
                    return (
                        <div>
                            <p>
                                <Text>
                                    {i18n.getDisplayName(
                                        'New_Visual_Placeholder_Editor'
                                    )}
                                </Text>
                            </p>
                        </div>
                    );
                }
                default: {
                    return (
                        <div>
                            <p>
                                {i18n.getDisplayName(
                                    'New_Visual_Placeholder_Open_Edit'
                                )}
                            </p>
                        </div>
                    );
                }
            }
        };
    return (
        <>
            <Stack
                styles={landingVerticalStackOuterStyles}
                tokens={landingVerticalOuterStackTokens}
            >
                <Stack
                    styles={landingVerticalStackStyles}
                    tokens={landingVerticalInnerStackTokens}
                >
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <div>
                                    <Text styles={landingVisualNameStyles}>
                                        {i18n.getDisplayName(
                                            'New_Visual_Placeholder_Title'
                                        )}
                                    </Text>
                                </div>
                                <div>
                                    <Text
                                        styles={landingVisualDescriptionStyles}
                                    >
                                        {i18n.getDisplayName(
                                            'New_Visual_Placeholder_Subtitle'
                                        )}
                                    </Text>
                                </div>
                            </Stack.Item>
                            <Stack.Item>
                                <div className='visual-header-image edit' />
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Separator styles={landingHorizontalSeparatorStyles} />
                    </Stack.Item>
                    <Stack.Item
                        verticalFill
                        styles={landingVerticalStackItemStyles}
                    >
                        {resolveDataInstruction()}
                    </Stack.Item>
                </Stack>
            </Stack>
        </>
    );
};

export default NewVisualPlaceholder;
