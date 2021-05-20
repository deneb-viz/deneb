import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Separator } from '@fluentui/react/lib/Separator';
import { Text } from '@fluentui/react/lib/Text';

import Debugger from '../../Debugger';
import {
    landingVisualNameStyles,
    landingVisualDescriptionStyles,
    landingVerticalStackItemStyles,
    landingHorizontalSeparatorStyles,
    landingVerticalInnerStackTokens,
    landingVerticalOuterStackTokens,
    landingVerticalStackOuterStyles,
    errorVerticalStackStyles
} from '../../config/styles';
import { ISpecificationErrorProps } from '../../types';

const SpecificationError = (props: ISpecificationErrorProps) => {
    Debugger.log('Rendering Component: [SpecificationError]...');
    const { error, i18n } = props;

    return (
        <>
            <Stack
                styles={landingVerticalStackOuterStyles}
                tokens={landingVerticalOuterStackTokens}
            >
                <Stack
                    styles={errorVerticalStackStyles}
                    tokens={landingVerticalInnerStackTokens}
                >
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <div>
                                    <Text styles={landingVisualNameStyles}>
                                        {i18n.getDisplayName(
                                            'Spec_Error_Heading'
                                        )}
                                    </Text>
                                </div>
                                <div>
                                    <Text
                                        styles={landingVisualDescriptionStyles}
                                    >
                                        {i18n.getDisplayName(
                                            'Spec_Error_Overview'
                                        )}
                                    </Text>
                                </div>
                            </Stack.Item>
                            <Stack.Item>
                                <div className='visual-header-image spec-error' />
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
                        <code>{error}</code>
                    </Stack.Item>
                </Stack>
            </Stack>
        </>
    );
};

export default SpecificationError;
