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
    showAPIError: (error: unknown | unknown[]) => void;
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

const isGenericAxiosMessage = (msg: string) =>
    /^Request failed with status code \d+$/.test(msg) || /^Network Error$/i.test(msg);

const isAPIError = (err: unknown): boolean => {
    if (!err || typeof err !== "object") return false;
    const e = err as Record<string, unknown>;
    // Axios always sets isAxiosError: true
    if (e.isAxiosError === true) return true;
    // Fallback structural check
    return !!(e.response || e.request || (e.config && typeof (e.config as Record<string, unknown>).url === "string"));
};

const getAPIResponseMessage = (err: unknown): string | null => {
    if (!err || typeof err !== "object") return null;
    const e = err as Record<string, unknown>;
    const data = ((e?.response as Record<string, unknown>)?.data ?? {}) as Record<string, unknown>;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    const nested = (data?.error ?? {}) as Record<string, unknown>;
    if (typeof nested?.message === "string" && nested.message.trim()) return nested.message;
    // Also skip generic Axios messages
    const fallback = (e as Record<string, unknown>)?.message;
    if (typeof fallback === "string" && !isGenericAxiosMessage(fallback)) return fallback;
    return null;
};

const getAPIRequestUrl = (err: unknown): string | null => {
    if (!err || typeof err !== "object") return null;
    const e = err as Record<string, unknown>;
    const configUrl = ((e?.config as Record<string, unknown>)?.url as string) ?? null;
    const responseUrl = ((e?.request as Record<string, unknown>)?.responseURL as string) ?? null;
    return configUrl || responseUrl || null;
};

const getAPIStatusCode = (err: unknown): number | null => {
    if (!err || typeof err !== "object") return null;
    const e = err as Record<string, unknown>;
    const statusFromResponse = (e?.response as Record<string, unknown>)?.status as number | undefined;
    const topLevelStatus = (e?.status as number | undefined) ?? undefined;
    return typeof statusFromResponse === "number"
        ? statusFromResponse
        : typeof topLevelStatus === "number"
        ? topLevelStatus
        : null;
};

const getAPIRequestMethod = (err: unknown): string | null => {
    if (!err || typeof err !== "object") return null;
    const e = err as Record<string, unknown>;
    const method = (e?.config as Record<string, unknown>)?.method as string | undefined;
    return method ? method.toUpperCase() : null;
};

const buildAPIErrorContent = (errors: unknown[]): ReactNode => {
    const withMessage = errors.filter((e) => getAPIResponseMessage(e));
    const withoutMessage = errors.filter((e) => !getAPIResponseMessage(e));

    const messageItems = withMessage.map(getAPIResponseMessage) as string[];

    const failingUrlInfos = withoutMessage
        .map((e) => ({ url: getAPIRequestUrl(e), status: getAPIStatusCode(e), method: getAPIRequestMethod(e) }))
        .filter((info) => info.url || info.status) as {
        url: string | null;
        status: number | null;
        method: string | null;
    }[];

    const unknownCount = withoutMessage.filter((e) => !getAPIRequestUrl(e) && !getAPIStatusCode(e)).length;

    return (
        <>
            {messageItems.length > 0 && (
                <div>
                    {messageItems.map((msg, i) => (
                        <div key={i}>{msg}</div>
                    ))}
                </div>
            )}
            {(failingUrlInfos.length > 0 || unknownCount > 0) && (
                <div style={{ marginTop: messageItems.length > 0 ? "8px" : undefined }}>
                    <div>
                        {`The server returned no error details. Failed API call${
                            failingUrlInfos.length + unknownCount > 1 ? "s" : ""
                        }:`}
                    </div>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                        {failingUrlInfos.map((info, i) => {
                            const label = [
                                info.status ? String(info.status) : null,
                                info.method && info.url ? `${info.method} ${info.url}` : info.url || info.method,
                            ]
                                .filter(Boolean)
                                .join(" - ");
                            return (
                                <li key={i}>
                                    <code>{label}</code>
                                </li>
                            );
                        })}
                        {unknownCount > 0 && (
                            <li>
                                {unknownCount} unknown endpoint{unknownCount > 1 ? "s" : ""} (no URL available)
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </>
    );
};

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

    const showAPIError = useCallback(
        (error: unknown | unknown[]) => {
            const errors = Array.isArray(error) ? error : [error];
            const hasAPIError = errors.some(isAPIError);

            if (!hasAPIError) {
                const first = errors[0];
                let message: ReactNode = "An unexpected error occurred.";
                if (first instanceof Error && first.message) {
                    message = first.message;
                } else if (typeof first === "string" && first.trim()) {
                    message = first;
                }
                showError("Something went wrong", message);
                return;
            }

            const content = buildAPIErrorContent(errors);
            setNotifications((prev) => [
                ...prev,
                {
                    title: "API Request Failed",
                    content,
                    id: uuid(),
                    duration: 8000,
                    showCopy: false,
                    icon: <Icon name="error" color="red" size={32} />,
                },
            ]);
        },
        [setNotifications, showError],
    );

    const contextValue = useMemo(
        () => ({
            showNotification,
            showSuccess,
            showError,
            showWarning,
            showAPIError,
        }),
        [showNotification, showSuccess, showError, showWarning, showAPIError],
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
    showAPIError: () => {
        throw new Error("NotificationProvider is not initialized");
    },
});
