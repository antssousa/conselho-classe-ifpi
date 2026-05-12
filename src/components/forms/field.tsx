import { Children, cloneElement, isValidElement, useId } from "react";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const child = Children.only(children);
  const enhanced =
    isValidElement<{ id?: string }>(child) && !child.props.id ? cloneElement(child, { id }) : child;

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {enhanced}
    </div>
  );
}
