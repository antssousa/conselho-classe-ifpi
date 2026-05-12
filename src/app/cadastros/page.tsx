import { createReferenceAction } from "../actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CadastrosPage() {
  await requireUser();
  const [campuses, courses, classGroups] = await Promise.all([
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ include: { campus: true }, orderBy: { name: "asc" } }),
    prisma.classGroup.findMany({ include: { course: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Cadastros</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Campus">
          <form action={createReferenceAction} className="grid gap-3">
            <input type="hidden" name="kind" value="campus" />
            <input name="name" placeholder="Nome" required />
            <input name="city" placeholder="Cidade" required />
            <Button>Salvar campus</Button>
          </form>
          <List items={campuses.map((campus) => `${campus.name} - ${campus.city}`)} />
        </Card>
        <Card title="Curso">
          <form action={createReferenceAction} className="grid gap-3">
            <input type="hidden" name="kind" value="course" />
            <input name="name" placeholder="Nome" required />
            <select name="campusId" required>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
            <Button>Salvar curso</Button>
          </form>
          <List items={courses.map((course) => `${course.name} - ${course.campus.name}`)} />
        </Card>
        <Card title="Turma">
          <form action={createReferenceAction} className="grid gap-3">
            <input type="hidden" name="kind" value="classGroup" />
            <input name="name" placeholder="Nome" required />
            <input name="year" type="number" defaultValue="2026" required />
            <select name="courseId" required>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <Button>Salvar turma</Button>
          </form>
          <List items={classGroups.map((group) => `${group.name} - ${group.course.name}`)} />
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

function Button({ children }: { children: React.ReactNode }) {
  return <button className="rounded-md bg-ifpi-green px-4 py-2 text-sm font-bold text-white">{children}</button>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2 text-sm text-slate-600">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-slate-50 px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}
