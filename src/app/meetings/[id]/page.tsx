import Link from "next/link";
import {
  addActionItemAction,
  addAgendaItemAction,
  addDeliberationAction,
  addDiscussionAction,
  addParticipantAction,
  addVoteAction,
  approveMinuteAction,
  callMeetingAction,
  finalizeMinuteAction,
  generateMinuteAction,
  openMeetingAction,
  reopenMinuteAction,
  signMinuteAction,
  updateMinuteAction,
} from "@/app/actions";
import { ActionForm } from "@/components/forms/action-form";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ParticipantSearch } from "./participant-search";
import { StudentCaseSection } from "./student-case-card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const tabs = [
  ["abertura", "Abertura"],
  ["pauta", "Pauta"],
  ["discussoes", "Discussões"],
  ["estudantes", "Estudantes"],
  ["encaminhamentos", "Encaminhamentos"],
  ["deliberacoes", "Deliberações e Votos"],
  ["ata", "Ata"],
  ["assinaturas", "Assinaturas"]
] as const;

export default async function MeetingRoomPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const currentUser = await requireUser();
  const [meeting, users] = await Promise.all([
    prisma.meeting.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        campus: true,
        course: true,
        classGroup: { include: { students: { orderBy: { name: "asc" } } } },
        participants: { include: { user: true, signatures: true }, orderBy: { createdAt: "asc" } },
        agendaItems: { orderBy: { createdAt: "asc" } },
        discussions: { orderBy: { createdAt: "desc" } },
        studentCases: { orderBy: { createdAt: "desc" } },
        actionItems: { include: { responsibleUser: true, student: true }, orderBy: { createdAt: "desc" } },
        deliberations: { include: { votes: { include: { user: true } } }, orderBy: { createdAt: "desc" } },
        minute: { include: { signatures: { include: { user: true } }, versions: { orderBy: { version: "desc" } } } },
        auditLogs: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 }
      }
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  ]);
  const activeTab = searchParams.tab || "abertura";
  const progress: Record<string, boolean> = {
    abertura: meeting.status !== "DRAFT",
    pauta: meeting.agendaItems.length > 0,
    discussoes: meeting.discussions.length > 0,
    estudantes: meeting.studentCases.length > 0,
    encaminhamentos: meeting.actionItems.length > 0,
    deliberacoes: meeting.deliberations.length > 0,
    ata: Boolean(meeting.minute),
    assinaturas: (meeting.minute?.signatures.length ?? 0) > 0
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-ifpi-green">
              Reuniões
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">{meeting.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {meeting.campus.name} · {meeting.course.name} · {meeting.classGroup.name}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(meeting.scheduledAt)} · {meeting.location}
            </p>
          </div>
          <div className="grid gap-2 text-sm lg:min-w-64">
            <Status label="Status" value={meeting.status} />
            <Status label="Participantes" value={`${meeting.participants.length}`} />
            <Status label="Ata" value={meeting.minute?.status || "Não gerada"} />
          </div>
        </div>
      </section>

      <nav role="tablist" aria-label="Etapas da reunião" className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => {
          const isActive = activeTab === id;
          const done = progress[id];
          return (
            <Link
              key={id}
              href={`/meetings/${meeting.id}?tab=${id}`}
              role="tab"
              aria-current={isActive ? "page" : undefined}
              aria-selected={isActive}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
                isActive ? "bg-ifpi-green text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  done ? (isActive ? "bg-white" : "bg-ifpi-green") : isActive ? "bg-white/40" : "bg-slate-300"
                }`}
              />
              {label}
              <span className="sr-only">{done ? " (concluído)" : " (pendente)"}</span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "abertura" ? (
        <Grid>
          <Panel title="Condução">
            <div className="space-y-3 text-sm text-slate-700">
              <p>{meeting.purpose || "Sem finalidade detalhada."}</p>
              <div className="flex flex-wrap gap-2">
                <HiddenForm action={callMeetingAction} meetingId={meeting.id} label="Convocar" />
                <HiddenForm action={openMeetingAction} meetingId={meeting.id} label="Abrir reunião" />
              </div>
              <RuleList
                items={[
                  "Abertura exige presidente.",
                  "Participantes adicionados são considerados presentes.",
                  "Eventos críticos são registrados em AuditLog.",
                  "Ata finalizada exige reabertura justificada para edição."
                ]}
              />
            </div>
          </Panel>
          <Panel title="Participantes">
            <ParticipantSearch
              meetingId={meeting.id}
              users={users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                title: user.title,
                imageUrl: user.imageUrl
              }))}
              existingUserIds={meeting.participants.map((participant) => participant.userId)}
              action={addParticipantAction}
            />
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-900">Já adicionados</h3>
              <List items={meeting.participants.map((participant) => `${participant.user.name} · ${participant.role}`)} />
            </div>
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "pauta" ? (
        <Grid>
          <Panel title="Nova pauta">
            <ActionForm action={addAgendaItemAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <Field label="Título">
                <input name="title" placeholder="Título da pauta" required />
              </Field>
              <Field label="Descrição">
                <textarea name="description" placeholder="Descrição" />
              </Field>
              <SubmitButton>Adicionar pauta</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Itens">
            <List items={meeting.agendaItems.map((item) => `${item.title} · ${item.status}`)} />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "discussoes" ? (
        <Grid>
          <Panel title="Registrar discussão">
            <ActionForm action={addDiscussionAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <Field label="Pauta relacionada">
                <select name="agendaItemId">
                  <option value="">Sem vínculo com pauta</option>
                  {meeting.agendaItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Título">
                <input name="title" placeholder="Título" required />
              </Field>
              <Field label="Registro integral">
                <textarea name="content" placeholder="Registro integral" required />
              </Field>
              <Field label="Resumo público (se sigiloso)">
                <textarea name="publicSummary" placeholder="Resumo público para registro sigiloso" />
              </Field>
              <Check name="confidential" label="Registro sigiloso" />
              <SubmitButton>Salvar discussão</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Registros">
            <List items={meeting.discussions.map((item) => `${item.title}${item.confidential ? " · sigiloso" : ""}`)} />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "estudantes" ? (
        <StudentCaseSection
          meetingId={meeting.id}
          students={meeting.classGroup.students.map((s) => ({ id: s.id, name: s.name, photoUrl: s.photoUrl }))}
          cases={meeting.studentCases.map((item) => ({
            id: item.id,
            studentId: item.studentId,
            studentName: item.studentName,
            registration: item.registration,
            photoUrl: item.photoUrl,
            summary: item.summary,
            publicSummary: item.publicSummary,
            confidential: item.confidential
          }))}
        />
      ) : null}

      {activeTab === "encaminhamentos" ? (
        <Grid>
          <Panel title="Novo encaminhamento">
            <ActionForm action={addActionItemAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <Field label="Encaminhamento">
                <input name="title" placeholder="Encaminhamento" required />
              </Field>
              <Field label="Descrição">
                <textarea name="description" placeholder="Descrição" />
              </Field>
              <Field label="Aluno relacionado (opcional)">
                <select name="studentId" defaultValue="">
                  <option value="">— Sem aluno vinculado —</option>
                  {meeting.classGroup.students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável">
                <select name="responsibleUserId" required>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prazo">
                <input name="dueDate" type="date" required />
              </Field>
              <SubmitButton>Salvar encaminhamento</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Encaminhamentos">
            <List
              items={meeting.actionItems.map(
                (item) =>
                  `${item.title}${item.student ? ` · aluno ${item.student.name}` : ""} · ${item.responsibleUser.name} · ${formatDate(item.dueDate)}`
              )}
            />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "deliberacoes" ? (
        <Grid>
          <Panel title="Deliberação">
            <ActionForm action={addDeliberationAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <Field label="Título">
                <input name="title" placeholder="Título" required />
              </Field>
              <Field label="Decisão">
                <textarea name="decision" placeholder="Decisão" required />
              </Field>
              <Field label="Status">
                <select name="status" defaultValue="APPROVED">
                  <option value="APPROVED">Aprovada</option>
                  <option value="REJECTED">Rejeitada</option>
                  <option value="DRAFT">Rascunho</option>
                </select>
              </Field>
              <Check name="requiresVote" label="Exige votação aberta" />
              <SubmitButton>Salvar deliberação</SubmitButton>
            </ActionForm>
          </Panel>
          <Panel title="Votos abertos">
            {meeting.deliberations.map((deliberation) => (
              <div key={deliberation.id} className="mb-4 rounded-md border border-slate-200 p-3">
                <strong className="text-sm">{deliberation.title}</strong>
                <p className="text-sm text-slate-600">{deliberation.decision}</p>
                {deliberation.requiresVote ? (
                  <ActionForm action={addVoteAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <input type="hidden" name="deliberationId" value={deliberation.id} />
                    <p className="text-xs font-semibold text-slate-500">Voto registrado como {currentUser.name}.</p>
                    <Field label="Voto">
                      <select name="choice" defaultValue="YES">
                        <option value="YES">Sim</option>
                        <option value="NO">Não</option>
                        <option value="ABSTAIN">Abstenção</option>
                      </select>
                    </Field>
                    <Field label="Justificativa">
                      <input name="justification" placeholder="Justificativa opcional" />
                    </Field>
                    <SubmitButton>Registrar voto</SubmitButton>
                  </ActionForm>
                ) : null}
                <List items={deliberation.votes.map((vote) => `${vote.user.name}: ${vote.choice}`)} />
              </div>
            ))}
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "ata" ? (
        <Grid>
          <Panel title="Ata">
            <div className="mb-3 flex flex-wrap gap-2">
              <HiddenForm action={generateMinuteAction} meetingId={meeting.id} label="Gerar ata" />
              {meeting.minute ? (
                <HiddenForm action={approveMinuteAction} meetingId={meeting.id} label="Marcar como lida/aprovada" />
              ) : null}
              {meeting.minute ? (
                <a className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold" href={`/meetings/${meeting.id}/minute.pdf`}>
                  Exportar PDF
                </a>
              ) : null}
            </div>
            {meeting.minute ? (
              <ActionForm action={updateMinuteAction} className="grid gap-3">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <Field label="Conteúdo">
                  <textarea name="content" className="min-h-96 font-mono" defaultValue={meeting.minute.content} />
                </Field>
                <Field label="Justificativa">
                  <input name="reason" placeholder="Justificativa para reabertura/edição" />
                </Field>
                <SubmitButton>Salvar ata</SubmitButton>
              </ActionForm>
            ) : (
              <p className="text-sm text-slate-600">Gere a ata após registrar presença.</p>
            )}
          </Panel>
          <Panel title="Versões e auditoria">
            <List items={(meeting.minute?.versions || []).map((version) => `v${version.version} · ${version.reason}`)} />
            <List items={meeting.auditLogs.map((log) => `${formatDate(log.createdAt)} · ${log.event} · ${log.user?.name || "Sistema"}`)} />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "assinaturas" ? (
        <Grid>
          <Panel title="Assinatura eletrônica">
            {meeting.minute ? (
              <>
                <p className="mb-3 text-sm text-slate-600">Hash atual da ata: {meeting.minute.contentHash}</p>
                <ActionForm action={signMinuteAction} className="grid gap-3">
                  <input type="hidden" name="meetingId" value={meeting.id} />
                  <p className="text-xs font-semibold text-slate-500">Assinatura registrada como {currentUser.name}.</p>
                  <SubmitButton>Registrar aceite e assinatura</SubmitButton>
                </ActionForm>
                <div className="mt-4">
                  <ActionForm action={finalizeMinuteAction}>
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <ConfirmSubmitButton message="Finalizar ata? Após finalizar, edições exigem reabertura justificada.">
                      Finalizar ata
                    </ConfirmSubmitButton>
                  </ActionForm>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">A ata precisa ser gerada e aprovada antes das assinaturas.</p>
            )}
          </Panel>
          <Panel title="Assinaturas">
            <List
              items={(meeting.minute?.signatures || []).map(
                (signature) => `${signature.user.name} · ${formatDate(signature.signedAt)} · ${signature.contentHash.slice(0, 16)}...`
              )}
            />
            <ActionForm action={reopenMinuteAction} className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <Field label="Justificativa de reabertura">
                <input name="reason" placeholder="Justificativa de reabertura" required />
              </Field>
              <ConfirmSubmitButton message="Reabrir ata finalizada?">Reabrir ata finalizada</ConfirmSubmitButton>
            </ActionForm>
          </Panel>
        </Grid>
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">{children}</div>;
}

function HiddenForm({
  action,
  meetingId,
  label
}: {
  action: (state: import("@/lib/action-result").ActionResult | null, formData: FormData) => Promise<import("@/lib/action-result").ActionResult>;
  meetingId: string;
  label: string;
}) {
  return (
    <ActionForm action={action}>
      <input type="hidden" name="meetingId" value={meetingId} />
      <SubmitButton>{label}</SubmitButton>
    </ActionForm>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium normal-case tracking-normal text-slate-700">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

function Status({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
      <span className="font-medium text-slate-500">{label}</span>
      <span className={good === undefined ? "font-bold text-slate-900" : good ? "font-bold text-ifpi-green" : "font-bold text-ifpi-red"}>
        {value}
      </span>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-slate-700">
      {items.length ? (
        items.map((item) => (
          <li key={item} className="rounded-md bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))
      ) : (
        <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">Nenhum registro.</li>
      )}
    </ul>
  );
}

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
