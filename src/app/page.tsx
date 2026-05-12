import Link from "next/link";
import { createMeetingAction } from "./actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  await requireUser();
  const [meetings, campuses, courses, classGroups] = await Promise.all([
    prisma.meeting.findMany({
      include: { campus: true, course: true, classGroup: true, participants: true, minute: true },
      orderBy: { scheduledAt: "desc" }
    }),
    prisma.campus.findMany({ orderBy: { name: "asc" } }),
    prisma.course.findMany({ orderBy: { name: "asc" } }),
    prisma.classGroup.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Reuniões</h1>
            <p className="mt-1 text-sm text-slate-600">Gerencie o ciclo de convocação, ata e assinaturas.</p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Reunião</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Presenças</th>
                <th className="px-4 py-3">Ata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meetings.map((meeting) => (
                <tr key={meeting.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/meetings/${meeting.id}`} className="font-semibold text-ifpi-green">
                      {meeting.title}
                    </Link>
                    <div className="text-xs text-slate-500">{formatDate(meeting.scheduledAt)}</div>
                  </td>
                  <td className="px-4 py-3">{meeting.classGroup.name}</td>
                  <td className="px-4 py-3">{meeting.status}</td>
                  <td className="px-4 py-3">
                    {meeting.participants.filter((participant) => participant.present).length}/{meeting.participants.length}
                  </td>
                  <td className="px-4 py-3">{meeting.minute?.status || "Não gerada"}</td>
                </tr>
              ))}
              {!meetings.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Nenhuma reunião cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Nova reunião</h2>
        <form action={createMeetingAction} className="mt-4 grid gap-3">
          <Field label="Título">
            <input name="title" required placeholder="Conselho de Classe 1º bimestre" />
          </Field>
          <Field label="Finalidade">
            <textarea name="purpose" placeholder="Análise pedagógica e deliberações." />
          </Field>
          <Field label="Data e hora">
            <input name="scheduledAt" type="datetime-local" required />
          </Field>
          <Field label="Local">
            <input name="location" defaultValue="Sala de reuniões" required />
          </Field>
          <Field label="Quórum mínimo">
            <input name="quorumMinimum" type="number" min="1" defaultValue="2" required />
          </Field>
          <Select name="campusId" label="Campus" options={campuses} />
          <Select name="courseId" label="Curso" options={courses} />
          <Select name="classGroupId" label="Turma" options={classGroups} />
          <button className="rounded-md bg-ifpi-green px-4 py-2 text-sm font-bold text-white">Criar reunião</button>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: { id: string; name: string }[] }) {
  return (
    <Field label={label}>
      <select name={name} required>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
