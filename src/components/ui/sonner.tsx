"use client"

import {
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  OctagonAlert,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      closeButton
      expand={false}
      visibleToasts={4}
      icons={{
        success: <Check className="size-4" strokeWidth={2.5} />,
        info: <Info className="size-4" strokeWidth={2.5} />,
        warning: <CircleAlert className="size-4" strokeWidth={2.5} />,
        error: <OctagonAlert className="size-4" strokeWidth={2.5} />,
        loading: <LoaderCircle className="size-4 animate-spin" strokeWidth={2.5} />,
        close: <X className="size-4" />,
      }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 pr-11 text-sm text-card-foreground shadow-lg animate__animated animate__faster animate__fadeInRight",
          title: "font-semibold leading-5",
          description: "mt-0.5 text-sm leading-5 text-muted-foreground",
          success:
            "[&_[data-icon]]:text-success [&_[data-icon]]:border-success/50",
          info:
            "[&_[data-icon]]:text-info [&_[data-icon]]:border-info/50",
          warning:
            "[&_[data-icon]]:text-warning [&_[data-icon]]:border-warning/50",
          error:
            "[&_[data-icon]]:text-destructive [&_[data-icon]]:border-destructive/50",
          loading:
            "[&_[data-icon]]:text-primary [&_[data-icon]]:border-primary/50",
          icon: "flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-transparent",
          closeButton:
            "right-2 top-2 left-auto flex size-7 items-center justify-center rounded-full border-0 bg-muted/60 p-0 text-muted-foreground opacity-100 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card",
          actionButton:
            "rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
