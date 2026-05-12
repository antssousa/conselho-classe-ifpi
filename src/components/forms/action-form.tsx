"use client";

import { useFormState } from "react-dom";
import type { ActionResult } from "@/lib/action-result";

type FormAction = (state: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export function ActionForm({
  action,
  children,
  className
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className={className}>
      {state?.message ? (
        <div
          className={
            state.ok
              ? "mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
              : "mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </div>
      ) : null}
      {children}
    </form>
  );
}
