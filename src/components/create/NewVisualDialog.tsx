import * as React from 'react';
import { useSelector } from 'react-redux';
import { useId } from '@uifabric/react-hooks';
import {
    Modal,
    IconButton,
    IIconProps,
    Stack,
    Text
} from 'office-ui-fabric-react';
import { PrimaryButton } from 'office-ui-fabric-react/lib/Button';

import Debugger from '../../Debugger';
import {
    modalDialogCloseIconStyles,
    modalDialogContentStyles,
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogStackItemWrapperStyles,
    modalDialogInnerStackTokens,
    primaryButtonStyles
} from '../../config/styles';
import { state } from '../../store';
import NewVisualDialogPivot from './NewVisualDialogPivot';
import TemplatePicker from './TemplatePicker';
import { commandService, specificationService } from '../../services';

const cancelIcon: IIconProps = { iconName: 'Cancel' };

export const NewVisualDialog: React.FC = () => {
    Debugger.log('Rendering Component: [NewVisualDialog]...');
    const root = useSelector(state),
        { i18n, isNewDialogVisible, viewport } = root.visual,
        {
            allPlaceholdersSupplied,
            selectedProvider,
            templateToApply
        } = root.templates,
        modalStyles = modalDialogContentStyles(viewport),
        handleClose = () => {
            commandService.closeNewDialog();
        },
        handleCreate = () => {
            Debugger.log('Create button clicked. Here goes...');
            specificationService.createFromTemplate(
                selectedProvider,
                templateToApply
            );
        },
        createDisabled = !allPlaceholdersSupplied;
    Debugger.log('Rendering Component: [EditorPaneExpanded]...');
    const titleId = useId('new-spec-dialog');

    return (
        <Modal
            titleAriaId={titleId}
            isOpen={isNewDialogVisible}
            onDismiss={handleClose}
            isBlocking={false}
            containerClassName={modalStyles.container}
            dragOptions={undefined}
        >
            <div className={modalStyles.header}>
                <span id={titleId}>
                    {i18n.getDisplayName('New_Spec_Heading')}
                </span>
                <IconButton
                    styles={modalDialogCloseIconStyles}
                    iconProps={cancelIcon}
                    ariaLabel={i18n.getDisplayName('New_Spec_Modal_Close')}
                    onClick={handleClose}
                />
            </div>
            <div className={modalStyles.body}>
                <Stack
                    styles={modalDialogStackStyles}
                    tokens={modalDialogInnerStackTokens}
                >
                    <Stack.Item shrink styles={modalDialogStackItemStyles}>
                        <Text variant='small'>
                            {i18n.getDisplayName('New_Spec_Assistive')}
                        </Text>
                    </Stack.Item>
                    <Stack.Item shrink styles={modalDialogStackItemStyles}>
                        <div className='editor-pane-pivot'>
                            <NewVisualDialogPivot />
                        </div>
                    </Stack.Item>
                    <Stack.Item
                        verticalFill
                        styles={modalDialogStackItemWrapperStyles}
                    >
                        <div className='new-spec-container'>
                            <TemplatePicker />
                        </div>
                    </Stack.Item>
                    <Stack.Item
                        shrink
                        styles={modalDialogStackItemStyles}
                        align='end'
                    >
                        <PrimaryButton
                            styles={primaryButtonStyles}
                            onClick={handleCreate}
                            text={i18n.getDisplayName('Button_Create')}
                            disabled={createDisabled}
                        />
                    </Stack.Item>
                </Stack>
            </div>
        </Modal>
    );
};

export default NewVisualDialog;
