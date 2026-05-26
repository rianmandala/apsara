/* eslint-disable @typescript-eslint/no-empty-function */
import React, { useRef, useState } from "react";

import Popover from "./Popover";
import Button from "../Button";
import Input from "../Input";
import { NotificationProvider, useNotification } from "../Notification/Notification";

export default {
    title: "General/Popover",
    component: Popover,
};

export const popoverContent = () => {
    const [val, setVal] = useState<string | number | readonly string[] | undefined>("");
    const onChange: React.FormEventHandler<HTMLInputElement> = (event: any) => {
        setVal(event.target.value);
    };
    return (
        <>
            <Popover
                title="Confirmation"
                content={
                    <div>
                        <Input value={val} onChange={onChange} />
                    </div>
                }
                okBtnProps={{
                    text: "ok",
                    style: { marginLeft: "10px" },
                }}
                cancelBtnProps={{
                    text: "Cancel",
                    style: { marginLeft: "10px" },
                }}
            >
                <Button>Default Button</Button>
            </Popover>
        </>
    );
};

export const popoverContentParam = () => {
    const [open, setOpen] = useState(false);
    const [val, setVal] = useState<string | number | readonly string[] | undefined>("");
    const onChange: React.FormEventHandler<HTMLInputElement> = (event: any) => {
        setVal(event.target.value);
    };
    return (
        <>
            <Popover
                title="Confirmation"
                content={
                    <div>
                        <Input value={val} onChange={onChange} />
                    </div>
                }
                cancelBtnProps={{
                    text: "Cancel",
                    style: { marginLeft: "10px" },
                }}
                open={open}
                onOpenChange={setOpen}
            >
                <Button>Default Button</Button>
            </Popover>
        </>
    );
};

const _CloseNotification = () => {
    const { showWarning, closeNotification } = useNotification();
    const warningIdRef = useRef<string | null>(null);

    const handleShowWarning = () => {
        if (warningIdRef.current) return;
        warningIdRef.current = showWarning("Retrying…", "Waiting for server to recover. Please hold on.", Infinity);
    };

    const handleClose = () => {
        if (warningIdRef.current) {
            closeNotification(warningIdRef.current);
            warningIdRef.current = null;
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>
            <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
                Shows a persistent warning toast (duration = Infinity) then closes it programmatically — simulating the
                503-retry resolved scenario.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
                <Button onClick={handleShowWarning}>Show Warning (Infinity)</Button>
                <Button onClick={handleClose}>Close Warning</Button>
            </div>
        </div>
    );
};

export const closeNotification = () => (
    <NotificationProvider>
        <_CloseNotification />
    </NotificationProvider>
);
