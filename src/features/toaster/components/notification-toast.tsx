import React from 'react';
import {
    Toast,
    ToastBody,
    ToastFooter,
    ToastTitle
} from '@fluentui/react-components';

interface INotificationToastProps {
    title: string;
    subtitle?: string;
    body: string;
    footer: React.ReactNode;
}

export const NotificationToast: React.FC<INotificationToastProps> = ({
    title,
    subtitle,
    body,
    footer
}) => {
    return (
        <Toast>
            <ToastTitle>{title}</ToastTitle>
            <ToastBody subtitle={subtitle}>{body}</ToastBody>
            <ToastFooter>{footer}</ToastFooter>
        </Toast>
    );
};
