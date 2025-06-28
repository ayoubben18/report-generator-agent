"use client"

import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { LucideIcon } from "lucide-react"

const buttonVariants = cva(
    "px-6 py-2 text-sm flex items-center gap-2 font-medium bg-muted rounded-2xl transition-colors",
    {
        variants: {
            variant: {
                active: "bg-primary text-card",
                default: "text-muted-foreground",
            },
            size: {
                sm: "px-2 py-1 text-xs",
                md: "px-4 py-2 text-sm",
                lg: "px-6 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)
const IconVariants = cva("size-4", {
    variants: {
        size: {
            sm: "size-4",
            md: "size-4",
            lg: "size-4",
        },
    },
    defaultVariants: {
        size: "md",
    },
})

type Option = {
    label: string
    value: string
    icon?: LucideIcon
}

interface Props extends React.ComponentProps<"div">, VariantProps<typeof buttonVariants> {
    options: [Option, Option]
    onValueChange: (value: string) => void
    value: string
}

const TypeToggle = ({ options, onValueChange, value, size, ...props }: Props) => {
    return (
        <div className="flex w-fit rounded-2xl border border-muted-darker bg-muted" {...props}>
            {options.map((option, index) => {
                const Icon = option.icon
                return (
                    <button
                        key={`${option.value}-${index}`}
                        type="button"
                        onClick={() => onValueChange(option.value)}
                        className={buttonVariants({
                            variant: value === option.value ? "active" : "default",
                            size,
                        })}
                    >
                        {Icon && <Icon className={IconVariants({ size })} />}
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

export default TypeToggle