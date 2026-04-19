import React, { forwardRef } from "react";
import { RadioGroup, StyledRadioItem, StyledIndicator, Label, Flex, StyledRadioButton } from "./Radio.styles";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { generateRandomId } from "../helper";
import { PREFIX_CLS } from "./constants";

export type RadioItem = {
    label?: string;
    value: string;
    disabled?: boolean;
    required?: boolean;
};

type RadioButtonType = {
    label?: string;
    value: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
};

type styleProps = {
    className?: string;
    style?: React.CSSProperties;
};

export type RadioProps = {
    defaultValue?: string;
    value?: string;
    items?: RadioItem[];
    onChange?: (value: string) => void;
    name?: string;
    required?: boolean;
    orientation?: "horizontal" | "vertical";
    dir?: "ltr" | "rtl";
    className?: string;
    style?: React.CSSProperties;
    itemStyle?: styleProps;
    children?: React.ReactNode;
    id?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "dir">;

const Radio = forwardRef<HTMLInputElement, RadioProps>(
    (
        {
            defaultValue,
            value,
            items,
            onChange,
            required,
            orientation,
            dir,
            id = generateRandomId(),
            itemStyle,
            children,
            ...rest
        },
        ref,
    ) => {
        return (
            <RadioGroup
                defaultValue={defaultValue}
                value={value}
                onValueChange={onChange}
                required={required}
                orientation={orientation}
                dir={dir}
                aria-label="View density"
                ref={ref}
                {...rest}
            >
                {items &&
                    items.map((item, i) => (
                        <Flex dir={dir} key={item.value}>
                            <StyledRadioItem
                                value={item.value}
                                disabled={item.disabled}
                                required={item.required}
                                {...itemStyle}
                                id={`${id}${item.value}${i}`}
                                className={`${PREFIX_CLS} ${rest.className ? rest.className : ""}`}
                            >
                                <StyledIndicator />
                            </StyledRadioItem>
                            <Label dir={dir} htmlFor={`${id}${item.value}${i}`}>
                                {item.label}
                            </Label>
                        </Flex>
                    ))}
                {!items && children}
            </RadioGroup>
        );
    },
);

const RadioButton = ({ label, value, children, ...props }: RadioButtonType) => {
    return (
        <RadioGroupPrimitive.Item value={value} asChild={true}>
            <StyledRadioButton {...props}>
                {children}
                {label}
            </StyledRadioButton>
        </RadioGroupPrimitive.Item>
    );
};

Radio.displayName = "Radio";

const CompoundRadio = Object.assign(Radio, {
    Root: RadioGroup,
    Item: StyledRadioItem,
    Indicator: StyledIndicator,
    Button: RadioButton,
});

export default CompoundRadio;
