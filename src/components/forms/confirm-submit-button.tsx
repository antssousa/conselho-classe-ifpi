"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  children,
  message,
  pendingLabel = "Processando...",
  className
}: {
  children: React.ReactNode;
  message: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={
        className ||
        "rounded-md border border-ifpi-red bg-white px-4 py-2 text-sm font-bold text-ifpi-red hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
