import { cva  } from 'class-variance-authority'
import type {VariantProps} from 'class-variance-authority';

import { cn } from '#/lib/utils.ts'

function ErrorDisplay({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="error-display"
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-destructive/15 bg-destructive/[0.035] p-8 text-center md:p-12',
        className,
      )}
      {...props}
    />
  )
}

function ErrorHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="error-header"
      className={cn(
        'flex max-w-sm flex-col items-center gap-2 text-center',
        className,
      )}
      {...props}
    />
  )
}

const errorIconVariants = cva(
  'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function ErrorIcon({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof errorIconVariants>) {
  return (
    <div
      data-slot="error-icon"
      data-variant={variant}
      className={cn(errorIconVariants({ variant, className }))}
      {...props}
    />
  )
}

function ErrorTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="error-title"
      className={cn('text-lg font-medium tracking-tight', className)}
      {...props}
    />
  )
}

function ErrorDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="error-description"
      className={cn('text-sm/relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

function ErrorAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="error-action"
      className={cn(
        'mt-2 flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
        className,
      )}
      {...props}
    />
  )
}

export {
  ErrorDisplay,
  ErrorHeader,
  ErrorTitle,
  ErrorDescription,
  ErrorAction,
  ErrorIcon,
}
