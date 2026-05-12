"use client";

import { useState } from "react";
import { createStudentAction, deleteStudentAction, updateStudentAction } from "@/app/actions";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { studentImage } from "@/lib/people";

export type StudentItem = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export function StudentManager({
  classGroupId,
  classGroupName,
  students
}: {
  classGroupId: string;
  classGroupName: string;
  students: StudentItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900"
        aria-expanded={open}
      >
        <span>Alunos ({students.length})</span>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <ActionForm action={createStudentAction} className="grid gap-2 rounded-md bg-slate-50 p-3">
            <input type="hidden" name="classGroupId" value={classGroupId} />
            <Field label={`Nome do aluno (${classGroupName})`}>
              <input name="name" required placeholder="Nome completo" />
            </Field>
            <Field label="URL da foto (opcional)">
              <input name="photoUrl" placeholder="https://..." />
            </Field>
            <SubmitButton>Adicionar aluno</SubmitButton>
          </ActionForm>

          <ul className="space-y-2">
            {students.length ? (
              students.map((student) => <StudentRow key={student.id} student={student} />)
            ) : (
              <li className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">Nenhum aluno cadastrado.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StudentRow({ student }: { student: StudentItem }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <li className="rounded-md bg-slate-50 px-3 py-2 text-sm">
        <ActionForm action={deleteStudentAction} className="flex items-center justify-between gap-3">
          <input type="hidden" name="id" value={student.id} />
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={studentImage(student.photoUrl)}
              alt={`Foto de ${student.name}`}
              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
            />
            <span className="truncate font-semibold text-slate-900">{student.name}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              Editar
            </button>
            <ConfirmSubmitButton
              message={`Remover ${student.name}?`}
              className="rounded-md border border-ifpi-red px-2 py-1 text-xs font-semibold text-ifpi-red hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
      <ActionForm action={updateStudentAction} className="grid gap-2">
        <input type="hidden" name="id" value={student.id} />
        <Field label="Nome">
          <input name="name" defaultValue={student.name} required />
        </Field>
        <Field label="URL da foto">
          <input name="photoUrl" defaultValue={student.photoUrl || ""} />
        </Field>
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
