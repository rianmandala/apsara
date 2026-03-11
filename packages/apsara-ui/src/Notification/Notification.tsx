import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import Icon from "../Icon";
import {
    Toast,
    ToastAction,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
    DescriptionWrapper,
    IconTitleWrapper,
    CopyButton,
} from "./Notification.styles";

export interface Notification {
    title: ReactNode;
    content?: ReactNode;
    icon?: ReactNode;
    footer?: ReactNode;
    id?: string;
    duration?: number;
    showCopy?: boolean;
}

export interface Notifier {
    showNotification: (notification: Notification) => void;
    showSuccess: (title: ReactNode, content?: ReactNode, duration?: number) => void;
    showError: (title: ReactNode, content?: ReactNode, duration?: number) => void;
    showWarning: (title: ReactNode, content?: ReactNode, duration?: number) => void;
}

export const useNotification = () => {
    return useContext(NotificationContext);
};

const uuid = () => {
    let dt = new Date().getTime();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
};

const defaultIcon = <Icon name="checkcircle" color="green" size={32} />;

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/g;
const URL_TEST_REGEX = /^https?:\/\/[^\s]+$/;

const renderTextWithLinks = (text: string): ReactNode => {
    const parts = text.split(URL_SPLIT_REGEX);
    return (
        <>
            {parts.map((part, i) =>
                URL_TEST_REGEX.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer">
                        {part}
                    </a>
                ) : (
                    part
                ),
            )}
        </>
    );
};

interface NotificationToastProps {
    notification: Notification;
    onOpenChange: () => void;
}

const NotificationToast = ({ notification, onOpenChange }: NotificationToastProps) => {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const isStringContent = typeof notification.content === "string";

    const handleCopy = useCallback(() => {
        const text = isStringContent ? String(notification.content) : "";
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setCopied(false), 2000);
        });
    }, [notification.content, isStringContent]);

    const showCopyButton = notification.showCopy === true && isStringContent;
    const duration = notification.duration ?? 3000;

    const renderContent = () => {
        if (isStringContent) {
            return renderTextWithLinks(String(notification.content));
        }
        return <>{notification.content}</>;
    };

    return (
        <Toast
            onSwipeStart={(event) => event.preventDefault()}
            onSwipeMove={(event) => event.preventDefault()}
            onSwipeEnd={(event) => event.preventDefault()}
            onOpenChange={onOpenChange}
            duration={duration}
        >
            <ToastTitle>
                <IconTitleWrapper>
                    {notification.icon || defaultIcon}
                    {notification.title}
                </IconTitleWrapper>
                {showCopyButton && (
                    <CopyButton onClick={handleCopy} aria-label={copied ? "Copied" : "Copy content"}>
                        <Icon name="copy" size={21} />
                        {copied ? "Copied!" : "Copy"}
                    </CopyButton>
                )}
            </ToastTitle>
            <ToastDescription asChild>
                <DescriptionWrapper>
                    {renderContent()}
                    {notification.footer}
                </DescriptionWrapper>
            </ToastDescription>
            <ToastAction asChild altText="Goto schedule to undo">
                <Icon name="cross" />
            </ToastAction>
        </Toast>
    );
};

export const NotificationProvider = ({ children }: any) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback(
        (notification: Notification) => {
            setNotifications((prevNotifications) => [...prevNotifications, { ...notification, id: uuid() }]);
        },
        [setNotifications],
    );

    const showSuccess = useCallback(
        (title: ReactNode, content?: ReactNode, duration?: number) => {
            setNotifications((prevNotifications) => [
                ...prevNotifications,
                {
                    title: title,
                    content: content,
                    id: uuid(),
                    duration: duration ?? 3000,
                    showCopy: false,
                    icon: <Icon name="checkcircle" color="green" size={32} />,
                },
            ]);
        },
        [setNotifications],
    );

    const showError = useCallback(
        (title: ReactNode, content?: ReactNode, duration?: number) => {
            setNotifications((prevNotifications) => [
                ...prevNotifications,
                {
                    title: title,
                    content: content,
                    id: uuid(),
                    duration: duration ?? 6000,
                    showCopy: true,
                    icon: <Icon name="error" color="red" size={32} />,
                },
            ]);
        },
        [setNotifications],
    );

    const showWarning = useCallback(
        (title: ReactNode, content?: ReactNode, duration?: number) => {
            setNotifications((prevNotifications) => [
                ...prevNotifications,
                {
                    title: title,
                    content: content,
                    id: uuid(),
                    duration: duration ?? 3000,
                    showCopy: false,
                    icon: <Icon name="error" color="orange" size={32} />,
                },
            ]);
        },
        [setNotifications],
    );

    const contextValue = useMemo(
        () => ({
            showNotification,
            showSuccess,
            showError,
            showWarning,
        }),
        [showNotification, showSuccess, showError, showWarning],
    );

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            <ToastProvider swipeDirection="right">
                {notifications.map((notification) => (
                    <NotificationToast
                        key={notification.id}
                        notification={notification}
                        onOpenChange={() => setNotifications(notifications.filter((t) => t.id !== notification.id))}
                    />
                ))}
                <ToastViewport />
            </ToastProvider>
        </NotificationContext.Provider>
    );
};

const NotificationContext = createContext<Notifier>({
    showNotification: () => {
        throw new Error("NotificationProvider is not initialized");
    },
    showSuccess: () => {
        throw new Error("NotificationProvider is not initialized");
    },
    showError: () => {
        throw new Error("NotificationProvider is not initialized");
    },
    showWarning: () => {
        throw new Error("NotificationProvider is not initialized");
    },
});
