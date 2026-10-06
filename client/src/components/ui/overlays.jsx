import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { Button } from './Button.jsx';

const OVERLAY =
  'fixed inset-0 z-(--z-overlay) bg-overlay backdrop-blur-[2px] ' +
  'data-[state=open]:animate-[overlay-in_200ms_ease-out] data-[state=closed]:animate-[overlay-out_150ms_ease-in]';

function CloseButton() {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-button text-muted transition-colors hover:bg-sunken hover:text-foreground md:h-9 md:w-9"
    >
      <X aria-hidden="true" className="h-5 w-5" />
    </DialogPrimitive.Close>
  );
}

// A centred modal. Focus is trapped inside and Escape closes it.
export function Dialog({ open, onOpenChange, title, description, children, className }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-(--z-overlay) max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-lift sm:p-6',
            'data-[state=open]:animate-[dialog-in_200ms_var(--ease-soft)] data-[state=closed]:animate-[dialog-out_150ms_ease-in]',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="font-display text-xl leading-snug">{title}</DialogPrimitive.Title>
            <CloseButton />
          </div>
          {description ? (
            <DialogPrimitive.Description className="mt-1.5 text-sm text-muted">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Asks before an action that cannot be undone.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Keep it',
  destructive = false,
  loading = false,
  error,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {error && (
        <p role="alert" className="mt-4 rounded-button border border-danger/30 bg-danger-soft px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

const SHEET_SIDES = {
  right:
    'inset-y-0 right-0 w-[min(22rem,88vw)] border-l ' +
    'data-[state=open]:animate-[sheet-right-in_250ms_var(--ease-soft)] data-[state=closed]:animate-[sheet-right-out_180ms_ease-in]',
  bottom:
    'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-card border-t ' +
    'data-[state=open]:animate-[sheet-bottom-in_250ms_var(--ease-soft)] data-[state=closed]:animate-[sheet-bottom-out_180ms_ease-in]',
};

// A panel that slides in from the right, or up from the bottom on phones.
export function Sheet({ open, onOpenChange, side = 'right', title, children, className }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-(--z-overlay) flex flex-col overflow-y-auto border-border bg-surface shadow-lift',
            SHEET_SIDES[side],
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <DialogPrimitive.Title className="font-display text-lg">{title}</DialogPrimitive.Title>
            <CloseButton />
          </div>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          <div className="flex-1 p-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}


// A dropdown menu opened from `trigger`. Arrow keys move between items.
export function Menu({ trigger, children, align = 'end', label }) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild aria-label={label}>
        {trigger}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-(--z-overlay) min-w-52 rounded-card border border-border bg-surface p-1.5 shadow-lift',
            'origin-(--radix-dropdown-menu-content-transform-origin)',
            'data-[state=open]:animate-[dialog-in_160ms_var(--ease-soft)] data-[state=closed]:animate-[dialog-out_110ms_ease-in]',
          )}
        >
          {children}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

const MENU_ITEM =
  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 text-sm font-medium outline-none transition-colors duration-100 ' +
  'data-[highlighted]:bg-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export function MenuItem({ icon: Icon, destructive = false, className, children, ...props }) {
  return (
    <MenuPrimitive.Item className={cn(MENU_ITEM, destructive && 'text-danger', className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="h-4 w-4 text-muted" strokeWidth={1.75} />}
      {children}
    </MenuPrimitive.Item>
  );
}

export function MenuLabel({ children }) {
  return <MenuPrimitive.Label className="px-2.5 py-2 text-xs text-muted">{children}</MenuPrimitive.Label>;
}

export function MenuSeparator() {
  return <MenuPrimitive.Separator className="my-1.5 h-px bg-border" />;
}
