import React from "react";

import Button from "../Button";
import Icon from "../Icon";
import { NotificationProvider, useNotification } from "./Notification";

const buildFetchAPIError = async (url: string, includeMessage: boolean): Promise<never> => {
    let response: Response;
    try {
        response = await fetch(url);
    } catch {
        const networkErr = new Error("Network error (CORS or unreachable)") as Error & Record<string, unknown>;
        networkErr.config = { url };
        networkErr.request = {};
        throw networkErr;
    }

    let data: Record<string, unknown> = {};
    try {
        data = await response.json();
    } catch {}

    const err = new Error(`Request failed with status code ${response.status}`) as Error & Record<string, unknown>;
    err.response = {
        status: response.status,
        data: includeMessage
            ? { message: (data.description as string) || (data.message as string) || `HTTP ${response.status}` }
            : {},
    };
    err.config = { url };
    throw err;
};

const simulateAPIWithErrorMessage = () => buildFetchAPIError("https://httpstat.us/500", true);

const simulateAPIWithoutErrorMessage = () => buildFetchAPIError("https://httpstat.us/400", false);

const simulateMultipleAPIsWithoutErrorMessage = async (): Promise<never> => {
    const urls = ["https://httpstat.us/503", "https://httpstat.us/502"];
    const results = await Promise.allSettled(urls.map((url) => buildFetchAPIError(url, false)));
    const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason);
    throw errors;
};

const simulateCodeError = (): never => {
    throw new TypeError("Cannot read properties of undefined (reading 'data')");
};

export default {
    title: "Feedback/Notifications",
};

export const notifications = () => {
    return (
        <NotificationProvider>
            <_Notifications />
        </NotificationProvider>
    );
};

export const APIErrorWithMessage = () => (
    <NotificationProvider>
        <_APIErrorWithMessage />
    </NotificationProvider>
);

export const APIErrorWithoutMessage = () => (
    <NotificationProvider>
        <_APIErrorWithoutMessage />
    </NotificationProvider>
);

export const NonAPIError = () => (
    <NotificationProvider>
        <_NonAPIError />
    </NotificationProvider>
);

const _Notifications = () => {
    const { showError, showNotification, showSuccess, showWarning } = useNotification();

    return (
        <div style={{ display: "flex" }}>
            <Button
                onClick={() => {
                    showSuccess("Success", "this is a test");
                }}
            >
                show Success
            </Button>
            <Button
                onClick={() => {
                    showError(
                        "Error",
                        `user with email "idil.amir@tokopedia.com" doesent have alicloud account. please refer into section 'A': https://gotocompany.sg.larksuite.com/docx/Izd4dNxLmosOSdx0dw0lXt0lgif?302from=wiki`,
                        60000,
                    );
                }}
            >
                show Error
            </Button>
            <Button
                onClick={() => {
                    showWarning("warning", "this", 60000);
                }}
            >
                show Warning
            </Button>
            <Button
                onClick={() => {
                    showNotification({
                        title: "Alerts Configured",
                        icon: <Icon name="copy2" />,
                        content:
                            "When you offer to subscribe to browser notifications for your users, it is very important to do so delicately and preferably in two steps.",
                        footer: (
                            <div style={{ display: "flex" }}>
                                <Button
                                    type="barebone"
                                    style={{ color: "#333", marginRight: "5px" }}
                                    iconProps={{ name: "copy2", color: "#333" }}
                                >
                                    Button 1
                                </Button>
                                <Button
                                    type="barebone"
                                    iconName="copy2"
                                    style={{ color: "#333" }}
                                    iconProps={{ name: "copy2", color: "#333" }}
                                >
                                    Button 2
                                </Button>
                            </div>
                        ),
                    });
                }}
            >
                custom notification with action
            </Button>
        </div>
    );
};

const _APIErrorWithMessage = () => {
    const { showAPIError } = useNotification();
    const [loading, setLoading] = React.useState(false);

    const handleClick = async () => {
        setLoading(true);
        try {
            await simulateAPIWithErrorMessage();
        } catch (err) {
            showAPIError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>
            <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
                Hits <code>https://httpstat.us/500</code> — a real <strong>500 Internal Server Error</strong>. The API
                response description is surfaced as the notification message.
            </p>
            <Button onClick={handleClick} disabled={loading}>
                {loading ? "Calling API…" : "Trigger API Error (with message)"}
            </Button>
        </div>
    );
};

const _APIErrorWithoutMessage = () => {
    const { showAPIError } = useNotification();
    const [loadingSingle, setLoadingSingle] = React.useState(false);
    const [loadingMultiple, setLoadingMultiple] = React.useState(false);

    const handleSingle = async () => {
        setLoadingSingle(true);
        try {
            await simulateAPIWithoutErrorMessage();
        } catch (err) {
            showAPIError(err);
        } finally {
            setLoadingSingle(false);
        }
    };

    const handleMultiple = async () => {
        setLoadingMultiple(true);
        try {
            await simulateMultipleAPIsWithoutErrorMessage();
        } catch (errs) {
            showAPIError(errs as unknown[]);
        } finally {
            setLoadingMultiple(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
                    Hits <code>https://httpstat.us/400</code> — a real <strong>400 Bad Request</strong> with no error
                    message in the body. The notification will list the failing endpoint URL instead.
                </p>
                <Button onClick={handleSingle} disabled={loadingSingle}>
                    {loadingSingle ? "Calling API…" : "Trigger API Error (single, no message)"}
                </Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
                    Hits <code>https://httpstat.us/503</code> and <code>https://httpstat.us/502</code> concurrently via{" "}
                    <code>Promise.allSettled</code>. The notification lists both failing endpoint URLs.
                </p>
                <Button onClick={handleMultiple} disabled={loadingMultiple}>
                    {loadingMultiple ? "Calling APIs…" : "Trigger Multiple API Errors (no message)"}
                </Button>
            </div>
        </div>
    );
};

const _NonAPIError = () => {
    const { showAPIError } = useNotification();

    const handleClick = () => {
        try {
            simulateCodeError();
        } catch (err) {
            showAPIError(err);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>
            <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
                Throws a plain <code>TypeError</code> with no <code>response</code>, <code>request</code>, or
                <code> config</code> property — i.e. a code error, not an API error.
                <code>showAPIError</code> detects this and falls back to a generic <code>showError</code>
                toast instead of listing API endpoints.
            </p>
            <Button onClick={handleClick}>Trigger Non-API (Code) Error</Button>
        </div>
    );
};
