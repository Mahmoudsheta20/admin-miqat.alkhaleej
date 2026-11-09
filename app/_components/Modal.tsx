"use client";
import { useUiText } from "@/lib/ui-text";


import { useEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "@/lib/languageContext";

interface ModalProps {
  children: ReactNode;
  label: string;
  onClose: () => void;
  isBusy?: boolean;
}

/** Native dialogs provide focus trapping, Escape handling, and focus restoration. */
export default function Modal({ children, label, onClose, isBusy = false }: ModalProps) {
  const ui = useUiText();

  const { dir } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return <dialog ref={ref} dir={dir} aria-label={ui(label)} aria-busy={isBusy}
    className="app-modal fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-2 sm:p-4"
    onCancel={event => { event.preventDefault(); if (!isBusy) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget && !isBusy) onClose(); }}>
    {children}
  </dialog>;
}
