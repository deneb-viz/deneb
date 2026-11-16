import { type ReactNode } from 'react';
import {
    Toast,
    ToastBody,
    ToastFooter,
    ToastTitle
} from '@fluentui/react-components';

type NotificationToastProps = {
    title: string;
    subtitle?: string;
    body: string;
    footer: ReactNode;
};

export const NotificationToast = ({
    title,
    subtitle,
    body,
    footer
}: NotificationToastProps) => {
    return (
        <Toast>
            <ToastTitle>{title}</ToastTitle>
            <ToastBody subtitle={subtitle}>{body}</ToastBody>
            <ToastFooter>{footer}</ToastFooter>
        </Toast>
    );
};
