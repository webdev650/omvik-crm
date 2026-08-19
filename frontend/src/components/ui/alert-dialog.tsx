import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './dialog';
import { Button } from './button';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'amber' | 'primary';
  onConfirm: () => void;
  isPending?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  isPending = false
}: AlertDialogProps) {
  const getButtonClass = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-600 hover:bg-red-500 text-white font-bold';
      case 'amber':
        return 'bg-amber-600 hover:bg-amber-500 text-white font-bold';
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
            <span>{variant === 'destructive' ? '⚠️' : '❓'}</span>
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs h-9"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isPending}
            className={`text-xs h-9 px-4 ${getButtonClass()}`}
          >
            {isPending ? 'Processing...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
