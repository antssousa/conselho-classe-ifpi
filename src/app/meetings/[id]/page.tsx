import Link from "next/link";
import {
  addActionItemAction,
  addAgendaItemAction,
  addDeliberationAction,
  addDiscussionAction,
  addParticipantAction,
  addStudentCaseAction,
  addVoteAction,
  approveMinuteAction,
  callMeetingAction,
  finalizeMinuteAction,
  generateMinuteAction,
  openMeetingAction,
  reopenMinuteAction,
  signMinuteAction,
  updateMinuteAction,
  updatePresenceAction
} from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { calculateQuorum } from "@/lib/domain/meeting-rules";
import { studentImage } from "@/lib/people";
import { prisma } from "@/lib/prisma";
import { ParticipantSearch } from "./participant-search";

const tabs = [
  ["abertura", "Abertura"],
  ["presenca", "Presença e Quórum"],
  ["pauta", "Pauta"],
  ["discussoes", "Discussões"],
  ["estudantes", "Estudantes"],
  ["encaminhamentos", "Encaminhamentos"],
  ["deliberacoes", "Deliberações e Votos"],
  ["ata", "Ata"],
  ["assinaturas", "Assinaturas"]
];

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
        classGroup: true,
        participants: { include: { user: true, signatures: true }, orderBy: { createdAt: "asc" } },
        agendaItems: { orderBy: { createdAt: "asc" } },
        discussions: { orderBy: { createdAt: "desc" } },
        studentCases: { orderBy: { createdAt: "desc" } },
        actionItems: { include: { responsibleUser: true }, orderBy: { createdAt: "desc" } },
        deliberations: { include: { votes: { include: { user: true } } }, orderBy: { createdAt: "desc" } },
        minute: { include: { signatures: { include: { user: true } }, versions: { orderBy: { version: "desc" } } } },
        auditLogs: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 }
      }
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  ]);
  const activeTab = searchParams.tab || "abertura";
  const quorum = calculateQuorum(meeting.participants, meeting.quorumMinimum);

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
            <Status label="Quórum" value={`${quorum.present}/${quorum.eligible} presentes · mínimo ${quorum.minimum}`} good={quorum.reached} />
            <Status label="Ata" value={meeting.minute?.status || "Não gerada"} />
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`/meetings/${meeting.id}?tab=${id}`}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              activeTab === id ? "bg-ifpi-green text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {activeTab === "abertura" ? (
        <Grid>
          <Panel title="Condução">
            <div className="space-y-3 text-sm text-slate-700">
              <p>{meeting.purpose || "Sem finalidade detalhada."}</p>
              <div className="flex flex-wrap gap-2">
                <Hidden name="meetingId" value={meeting.id} action={callMeetingAction} label="Convocar" />
                <Hidden name="meetingId" value={meeting.id} action={openMeetingAction} label="Abrir reunião" />
              </div>
              <RuleList
                items={[
                  "Abertura exige presidente e secretário.",
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

      {activeTab === "presenca" ? (
        <Panel title="Presença e Quórum">
          <div className="mb-4 rounded-md bg-slate-50 p-4 text-sm">
            Quórum calculado automaticamente: <strong>{quorum.reached ? "atingido" : "não atingido"}</strong>.
          </div>
          <div className="grid gap-2">
            {meeting.participants.map((participant) => (
              <form key={participant.id} action={updatePresenceAction} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <input type="hidden" name="participantId" value={participant.id} />
                <span className="text-sm">
                  <strong>{participant.user.name}</strong> · {participant.role}
                </span>
                <label className="flex items-center gap-2 text-sm normal-case tracking-normal text-slate-700">
                  <input name="present" type="checkbox" defaultChecked={participant.present} className="h-4 w-4" />
                  Presente
                  <Button>Salvar</Button>
                </label>
              </form>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "pauta" ? (
        <Grid>
          <Panel title="Nova pauta">
            <form action={addAgendaItemAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input name="title" placeholder="Título da pauta" required />
              <textarea name="description" placeholder="Descrição" />
              <Button>Adicionar pauta</Button>
            </form>
          </Panel>
          <Panel title="Itens">
            <List items={meeting.agendaItems.map((item) => `${item.title} · ${item.status}`)} />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "discussoes" ? (
        <Grid>
          <Panel title="Registrar discussão">
            <form action={addDiscussionAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <select name="agendaItemId">
                <option value="">Sem vínculo com pauta</option>
                {meeting.agendaItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <input name="title" placeholder="Título" required />
              <textarea name="content" placeholder="Registro integral" required />
              <textarea name="publicSummary" placeholder="Resumo público para registro sigiloso" />
              <Check name="confidential" label="Registro sigiloso" />
              <Button>Salvar discussão</Button>
            </form>
          </Panel>
          <Panel title="Registros">
            <List items={meeting.discussions.map((item) => `${item.title}${item.confidential ? " · sigiloso" : ""}`)} />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "estudantes" ? (
        <Grid>
          <Panel title="Estudante discutido">
            <form action={addStudentCaseAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input name="studentName" placeholder="Nome do estudante" required />
              <input name="registration" placeholder="Matrícula" />
              <input name="photoUrl" placeholder="URL da foto do estudante" />
              <textarea name="summary" placeholder="Síntese do caso" required />
              <textarea name="publicSummary" placeholder="Resumo público" />
              <Check name="confidential" label="Sigiloso" defaultChecked />
              <Button>Salvar estudante</Button>
            </form>
          </Panel>
          <Panel title="Casos">
            <div className="grid gap-3">
              {meeting.studentCases.length ? (
                meeting.studentCases.map((item) => (
                  <div key={item.id} className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={studentImage(item.photoUrl)}
                      alt={`Foto de ${item.studentName}`}
                      className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{item.studentName}</p>
                      <p className="truncate text-xs text-slate-500">{item.registration || "Sem matrícula informada"}</p>
                      <p className="text-xs font-semibold text-slate-500">{item.confidential ? "Sigiloso" : "Público"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">Nenhum registro.</div>
              )}
            </div>
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "encaminhamentos" ? (
        <Grid>
          <Panel title="Novo encaminhamento">
            <form action={addActionItemAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input name="title" placeholder="Encaminhamento" required />
              <textarea name="description" placeholder="Descrição" />
              <select name="responsibleUserId" required>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <input name="dueDate" type="date" required />
              <Button>Salvar encaminhamento</Button>
            </form>
          </Panel>
          <Panel title="Encaminhamentos">
            <List items={meeting.actionItems.map((item) => `${item.title} · ${item.responsibleUser.name} · ${formatDate(item.dueDate)}`)} />
          </Panel>
        </Grid>
      ) : null}

      {activeTab === "deliberacoes" ? (
        <Grid>
          <Panel title="Deliberação">
            <form action={addDeliberationAction} className="grid gap-3">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input name="title" placeholder="Título" required />
              <textarea name="decision" placeholder="Decisão" required />
              <select name="status">
                <option value="APPROVED">Aprovada</option>
                <option value="REJECTED">Rejeitada</option>
                <option value="DRAFT">Rascunho</option>
              </select>
              <Check name="requiresVote" label="Exige votação aberta" />
              <Button>Salvar deliberação</Button>
            </form>
          </Panel>
          <Panel title="Votos abertos">
            {meeting.deliberations.map((deliberation) => (
              <div key={deliberation.id} className="mb-4 rounded-md border border-slate-200 p-3">
                <strong className="text-sm">{deliberation.title}</strong>
                <p className="text-sm text-slate-600">{deliberation.decision}</p>
                {deliberation.requiresVote ? (
                  <form action={addVoteAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <input type="hidden" name="deliberationId" value={deliberation.id} />
                    <select name="userId" defaultValue={currentUser.id}>
                      {meeting.participants
                        .filter((participant) => participant.present)
                        .map((participant) => (
                          <option key={participant.userId} value={participant.userId}>
                            {participant.user.name}
                          </option>
                        ))}
                    </select>
                    <select name="choice">
                      <option value="YES">Sim</option>
                      <option value="NO">Não</option>
                      <option value="ABSTAIN">Abstenção</option>
                    </select>
                    <input name="justification" placeholder="Justificativa opcional" />
                    <Button>Registrar voto</Button>
                  </form>
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
              <Hidden name="meetingId" value={meeting.id} action={generateMinuteAction} label="Gerar ata" />
              {meeting.minute ? <Hidden name="meetingId" value={meeting.id} action={approveMinuteAction} label="Marcar como lida/aprovada" /> : null}
              {meeting.minute ? (
                <a className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold" href={`/meetings/${meeting.id}/minute.pdf`}>
                  Exportar PDF
                </a>
              ) : null}
            </div>
            {meeting.minute ? (
              <form action={updateMinuteAction} className="grid gap-3">
                <input type="hidden" name="meetingId" value={meeting.id} />
                <textarea name="content" className="min-h-96 font-mono" defaultValue={meeting.minute.content} />
                <input name="reason" placeholder="Justificativa para reabertura/edição" />
                <Button>Salvar ata</Button>
              </form>
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
                <form action={signMinuteAction} className="grid gap-3">
                  <input type="hidden" name="meetingId" value={meeting.id} />
                  <select name="userId" defaultValue={currentUser.id}>
                    {meeting.participants
                      .filter((participant) => participant.present)
                      .map((participant) => (
                        <option key={participant.userId} value={participant.userId}>
                          {participant.user.name}
                        </option>
                      ))}
                  </select>
                  <Button>Registrar aceite e assinatura</Button>
                </form>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Hidden name="meetingId" value={meeting.id} action={finalizeMinuteAction} label="Finalizar ata" />
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
            <form action={reopenMinuteAction} className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
              <input type="hidden" name="meetingId" value={meeting.id} />
              <input name="reason" placeholder="Justificativa de reabertura" required />
              <Button>Reabrir ata finalizada</Button>
            </form>
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

function Button({ children }: { children: React.ReactNode }) {
  return <button className="rounded-md bg-ifpi-green px-4 py-2 text-sm font-bold text-white hover:bg-green-800">{children}</button>;
}

function Hidden({ name, value, action, label }: { name: string; value: string; action: (formData: FormData) => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name={name} value={value} />
      <Button>{label}</Button>
    </form>
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
