"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxExtraProps {
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & CheckboxExtraProps
>(({ className, indeterminate, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={indeterminate ? "indeterminate" : checked}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded border border-primary shadow-sm transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {indeterminate ? (
        <Minus className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
