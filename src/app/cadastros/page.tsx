import { createReferenceAction } from "../actions";
import { CadastroRow } from "./cadastro-row";
import { StudentManager } from "./student-manager";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CadastrosPage() {
  await requireUser();
  const [campuses, courses, classGroups] = await Promise.all([
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.classGroup.findMany({
      include: { course: true, students: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Cadastros</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Campus">
          <ActionForm action={createReferenceAction} className="grid gap-3">
            <input type="hidden" name="kind" value="campus" />
            <Field label="Nome">
              <input name="name" required />
            </Field>
            <Field label="Cidade">
              <input name="city" required />
            </Field>
            <SubmitButton>Salvar campus</SubmitButton>
          </ActionForm>
          <ul className="mt-4 space-y-2">
            {campuses.map((campus) => (
              <CadastroRow
                key={campus.id}
                row={{
                  id: campus.id,
                  kind: "campus",
                  title: campus.name,
                  subtitle: campus.city,
                  fields: { name: campus.name, city: campus.city }
                }}
              />
            ))}
            {!campuses.length ? <EmptyHint>Nenhum campus cadastrado.</EmptyHint> : null}
          </ul>
        </Card>
        <Card title="Curso">
          <ActionForm action={createReferenceAction} className="grid gap-3">
            <input type="hidden" name="kind" value="course" />
            <Field label="Nome">
              <input name="name" required />
            </Field>
            <Field label="Campus">
              <select name="campusId" required>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Salvar curso</SubmitButton>
          </ActionForm>
          <ul className="mt-4 space-y-2">
            {courses.map((course) => (
              <CadastroRow
                key={course.id}
                row={{
                  id: course.id,
                  kind: "course",
                  title: course.name,
                  subtitle: course.campus.name,
                  fields: { name: course.name, parentId: course.campusId },
                  parents: campuses.map((campus) => ({ id: campus.id, name: campus.name })),
                  parentLabel: "Campus",
                  parentField: "campusId"
                }}
              />
            ))}
            {!courses.length ? <EmptyHint>Nenhum curso cadastrado.</EmptyHint> : null}
          </ul>
        </Card>
        <Card title="Turma">
          <ActionForm action={createReferenceAction} className="grid gap-3">
            <input type="hidden" name="kind" value="classGroup" />
            <Field label="Nome">
              <input name="name" required />
            </Field>
            <Field label="Ano">
              <input name="year" type="number" defaultValue="2026" required />
            </Field>
            <Field label="Curso">
              <select name="courseId" required>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Salvar turma</SubmitButton>
          </ActionForm>
          <div className="mt-4 space-y-3">
            {classGroups.map((group) => (
              <div key={group.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <ul className="space-y-2">
                  <CadastroRow
                    row={{
                      id: group.id,
                      kind: "classGroup",
                      title: group.name,
                      subtitle: `${group.course.name} · ${group.year}`,
                      fields: { name: group.name, year: group.year, parentId: group.courseId },
                      parents: courses.map((course) => ({ id: course.id, name: course.name })),
                      parentLabel: "Curso",
                      parentField: "courseId"
                    }}
                  />
                </ul>
                <StudentManager
                  classGroupId={group.id}
                  classGroupName={group.name}
                  students={group.students.map((student) => ({
                    id: student.id,
                    name: student.name,
                    photoUrl: student.photoUrl
                  }))}
                />
              </div>
            ))}
            {!classGroups.length ? (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">Nenhuma turma cadastrada.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <li className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">{children}</li>;
}
