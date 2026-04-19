"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-border/50", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    actions?: React.ReactNode
  }
>(({ className, children, actions, ...props }, ref) => (
  <AccordionPrimitive.Header
    className="flex items-center gap-1"
    data-testid="accordion-header"
  >
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex min-w-0 flex-1 items-center py-3 text-left text-sm font-medium transition-all hover:text-primary",
        className
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate" data-testid="accordion-title">
        {children}
      </span>
    </AccordionPrimitive.Trigger>
    {actions ? (
      <div
        className="flex shrink-0 items-center gap-1"
        data-testid="accordion-actions"
      >
        {actions}
      </div>
    ) : null}
    <AccordionPrimitive.Trigger
      aria-hidden
      tabIndex={-1}
      className="flex shrink-0 items-center py-3 text-primary/60 transition-transform duration-200 hover:text-primary data-[state=open]:rotate-90"
    >
      <ChevronRight
        className="h-4 w-4"
        data-testid="accordion-chevron"
        data-direction="right"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
