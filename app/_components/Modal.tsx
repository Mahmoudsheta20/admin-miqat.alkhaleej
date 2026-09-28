"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  label: string;
  onClose: () => void;
  isBusy?: boolean;
}

/** Native dialogs provide focus trapping, Escape handling, and focus restoration. */
export default function Modal({ children, label, onClose, isBusy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={ref} dir="rtl" aria-label={label} aria-busy={isBusy}
    className="app-modal fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-2 sm:p-4"
    onCancel={event => { event.preventDefault(); if (!isBusy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !isBusy) onClose(); }}>
    {children}
  </dialog>;
}
