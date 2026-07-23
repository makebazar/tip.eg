import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent text-sm font-semibold whitespace-nowrap transition-all outline-none select-none cursor-pointer disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#B58A1C] text-white hover:bg-[#967112] shadow-xs active:bg-[#85630e]",
        secondary:
          "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs",
        outline:
          "border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-100/60",
        destructive:
          "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link:
          "text-[#B58A1C] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 gap-2 text-sm",
        sm: "h-8 px-3 gap-1.5 text-xs rounded-lg",
        lg: "h-12 px-6 gap-2.5 text-base rounded-xl",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
