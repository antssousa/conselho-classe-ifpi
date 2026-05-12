"use client";

import { useState } from "react";
import { deleteReferenceAction, updateReferenceAction } from "@/app/actions";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";

type Kind = "campus" | "course" | "classGroup";

type SelectOption = { id: string; name: string };

type Row = {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  fields: { name: string; city?: string; year?: number; parentId?: string };
  parents?: SelectOption[];
  parentLabel?: string;
  parentField?: "campusId" | "courseId";
};

export function CadastroRow({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <li className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <ActionForm action={deleteReferenceAction} className="flex items-center justify-between gap-3">
          <input type="hidden" name="kind" value={row.kind} />
          <input type="hidden" name="id" value={row.id} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{row.title}</p>
            <p className="truncate text-xs text-slate-500">{row.subtitle}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              Editar
            </button>
            <ConfirmSubmitButton
              message={`Remover ${row.title}?`}
              className="rounded-md border border-ifpi-red px-3 py-1 text-xs font-semibold text-ifpi-red hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remover
            </ConfirmSubmitButton>
          </div>
        </ActionForm>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <ActionForm action={updateReferenceAction} className="grid gap-3">
        <input type="hidden" name="kind" value={row.kind} />
        <input type="hidden" name="id" value={row.id} />
        <Field label="Nome">
          <input name="name" defaultValue={row.fields.name} required />
        </Field>
        {row.fields.city !== undefined ? (
          <Field label="Cidade">
            <input name="city" defaultValue={row.fields.city} required />
          </Field>
        ) : null}
        {row.fields.year !== undefined ? (
          <Field label="Ano">
            <input name="year" type="number" defaultValue={row.fields.year} required />
          </Field>
        ) : null}
        {row.parents && row.parentLabel && row.parentField && row.fields.parentId !== undefined ? (
          <Field label={row.parentLabel}>
            <select name={row.parentField} defaultValue={row.fields.parentId} required>
              {row.parents.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <div className="flex gap-2">
          <SubmitButton>Salvar</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </ActionForm>
    </li>
  );
}
