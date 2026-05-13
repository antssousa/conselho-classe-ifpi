"use client";

import { useMemo, useState } from "react";
import { addStudentCaseAction, updateStudentCaseAction } from "@/app/actions";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { studentImage } from "@/lib/people";

type StudentOption = { id: string; name: string; photoUrl: string | null };

type StudentCaseData = {
  id: string;
  studentId: string | null;
  studentName: string;
  registration: string | null;
  photoUrl: string | null;
  summary: string;
  publicSummary: string | null;
  confidential: boolean;
};

type Selection =
  | { mode: "idle" }
  | { mode: "new"; student: StudentOption }
  | { mode: "edit"; studentCase: StudentCaseData };

export function StudentCaseSection({
  meetingId,
  students,
  cases
}: {
  meetingId: string;
  students: StudentOption[];
  cases: StudentCaseData[];
}) {
  const [selection, setSelection] = useState<Selection>({ mode: "idle" });
  const [search, setSearch] = useState("");

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return students.filter((s) =>
      s.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(q)
    );
  }, [students, search]);

  const casesById = useMemo(() => {
    const map = new Map<string, StudentCaseData>();
    for (const c of cases) {
      if (c.studentId) map.set(c.studentId, c);
    }
    return map;
  }, [cases]);

  function selectStudent(student: StudentOption) {
    const existing = casesById.get(student.id);
    if (existing) {
      setSelection({ mode: "edit", studentCase: existing });
    } else {
      setSelection({ mode: "new", student });
    }
  }

  function editCase(sc: StudentCaseData) {
    setSelection({ mode: "edit", studentCase: sc });
  }

  const selectedPhoto =
    selection.mode === "new"
      ? selection.student.photoUrl
      : selection.mode === "edit"
        ? selection.studentCase.photoUrl
        : null;

  const selectedName =
    selection.mode === "new"
      ? selection.student.name
      : selection.mode === "edit"
        ? selection.studentCase.studentName
        : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Main: student grid */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Turma</h2>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
          {students.map((student) => {
            const hasCase = casesById.has(student.id);
            const isSelected =
              (selection.mode === "new" && selection.student.id === student.id) ||
              (selection.mode === "edit" && selection.studentCase.studentId === student.id);

            return (
              <button
                key={student.id}
                type="button"
                onClick={() => selectStudent(student)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-colors ${
                  isSelected
                    ? "border-ifpi-green bg-green-50"
                    : hasCase
                      ? "border-green-300 bg-green-50/50 hover:bg-green-50"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={studentImage(student.photoUrl)}
                  alt={student.name}
                  className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                />
                <span className="text-xs font-semibold text-slate-900 line-clamp-2">{student.name}</span>
                {hasCase ? (
                  <span className="rounded-full bg-ifpi-green px-2 py-0.5 text-[10px] font-bold text-white">Registrado</span>
                ) : null}
              </button>
            );
          })}
          {!students.length ? (
            <p className="col-span-full text-sm text-slate-500">Nenhum aluno cadastrado na turma.</p>
          ) : null}
        </div>

        {/* Cases without linked student */}
        {cases.filter((c) => !c.studentId).length > 0 ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-bold text-slate-900">Casos sem vínculo</h3>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
              {cases.filter((c) => !c.studentId).map((sc) => {
                const isSelected = selection.mode === "edit" && selection.studentCase.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => editCase(sc)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-colors ${
                      isSelected ? "border-ifpi-green bg-green-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={studentImage(sc.photoUrl)}
                      alt={sc.studentName}
                      className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                    />
                    <span className="text-xs font-semibold text-slate-900 line-clamp-2">{sc.studentName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {/* Sidebar: search + form */}
      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {selection.mode === "idle" ? (
          <>
            <h2 className="text-lg font-bold text-slate-950">Buscar aluno</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome do aluno..."
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ifpi-green focus:outline-none focus:ring-1 focus:ring-ifpi-green"
              autoFocus
            />
            {search.trim() ? (
              <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        selectStudent(student);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={studentImage(student.photoUrl)}
                        alt={student.name}
                        className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                      />
                      <span className="font-medium text-slate-900">{student.name}</span>
                      {casesById.has(student.id) ? (
                        <span className="ml-auto text-[10px] font-bold text-ifpi-green">Registrado</span>
                      ) : null}
                    </button>
                  </li>
                ))}
                {!filteredStudents.length ? (
                  <li className="px-3 py-2 text-sm text-slate-500">Nenhum aluno encontrado.</li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Selecione um aluno no quadro ou busque pelo nome.</p>
            )}
          </>
        ) : (
          <>
            {/* Photo header */}
            <div className="flex flex-col items-center gap-3 border-b border-slate-200 pb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={studentImage(selectedPhoto)}
                alt={selectedName || ""}
                className="h-24 w-24 rounded-full border-2 border-slate-200 object-cover"
              />
              <h2 className="text-center text-lg font-bold text-slate-950">{selectedName}</h2>
              <button
                type="button"
                onClick={() => setSelection({ mode: "idle" })}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                ← Voltar para busca
              </button>
            </div>

            {/* Form */}
            <div className="mt-4">
              <ActionForm
                key={selection.mode === "edit" ? selection.studentCase.id : "new"}
                action={selection.mode === "edit" ? updateStudentCaseAction : addStudentCaseAction}
                className="grid gap-3"
              >
                <input type="hidden" name="meetingId" value={meetingId} />
                {selection.mode === "edit" ? (
                  <input type="hidden" name="id" value={selection.studentCase.id} />
                ) : null}
                {selection.mode === "new" ? (
                  <>
                    <input type="hidden" name="studentId" value={selection.student.id} />
                    <input type="hidden" name="studentName" value={selection.student.name} />
                    <input type="hidden" name="photoUrl" value={selection.student.photoUrl || ""} />
                  </>
                ) : (
                  <>
                    <Field label="Nome do estudante">
                      <input name="studentName" defaultValue={selection.studentCase.studentName} required />
                    </Field>
                    <Field label="URL da foto">
                      <input name="photoUrl" defaultValue={selection.studentCase.photoUrl || ""} />
                    </Field>
                  </>
                )}
                <Field label="Matrícula">
                  <input
                    name="registration"
                    defaultValue={selection.mode === "edit" ? selection.studentCase.registration || "" : ""}
                    placeholder="Matrícula"
                  />
                </Field>
                <Field label="Síntese do caso">
                  <textarea
                    name="summary"
                    defaultValue={selection.mode === "edit" ? selection.studentCase.summary : ""}
                    placeholder="Síntese do caso"
                    required
                    className="min-h-32"
                  />
                </Field>
                <Field label="Resumo público">
                  <textarea
                    name="publicSummary"
                    defaultValue={selection.mode === "edit" ? selection.studentCase.publicSummary || "" : ""}
                    placeholder="Resumo público"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    name="confidential"
                    type="checkbox"
                    defaultChecked={selection.mode === "edit" ? selection.studentCase.confidential : true}
                    className="h-4 w-4"
                  />
                  Sigiloso
                </label>
                <SubmitButton>{selection.mode === "edit" ? "Salvar alterações" : "Registrar caso"}</SubmitButton>
              </ActionForm>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
