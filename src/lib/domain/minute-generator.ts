import { calculateContentHash, redactConfidentialText } from "./meeting-rules";

type Participant = {
  name: string;
  role: string;
  present: boolean;
};

type TextRecord = {
  title: string;
  content: string;
  confidential?: boolean;
  publicSummary?: string | null;
};

type MinuteInput = {
  title: string;
  campus: string;
  course: string;
  classGroup: string;
  scheduledAt: Date;
  location: string;
  participants: Participant[];
  agendaItems: { title: string; description?: string | null }[];
  discussions: TextRecord[];
  studentCases: {
    studentName: string;
    summary: string;
    confidential?: boolean;
    publicSummary?: string | null;
  }[];
  actionItems: {
    title: string;
    responsibleName: string;
    dueDate: Date;
    description?: string | null;
  }[];
  deliberations: {
    title: string;
    decision: string;
    status: string;
    votes?: { voterName: string; choice: string; justification?: string | null }[];
  }[];
};

export function generateMinuteText(input: MinuteInput) {
  const fullContent = composeMinute(input, false);
  const publicContent = composeMinute(input, true);

  return {
    content: fullContent,
    publicContent,
    contentHash: calculateContentHash(fullContent)
  };
}

function composeMinute(input: MinuteInput, publicOnly: boolean) {
  const present = input.participants.filter((participant) => participant.present);
  const absent = input.participants.filter((participant) => !participant.present);

  return [
    `ATA DO CONSELHO DE CLASSE - ${input.title}`,
    `Campus: ${input.campus}`,
    `Curso: ${input.course}`,
    `Turma: ${input.classGroup}`,
    `Data e local: ${formatDate(input.scheduledAt)} - ${input.location}`,
    "",
    "PARTICIPANTES PRESENTES",
    present.map((participant) => `- ${participant.name} (${participant.role})`).join("\n") || "- Sem presença registrada",
    "",
    "AUSÊNCIAS",
    absent.map((participant) => `- ${participant.name} (${participant.role})`).join("\n") || "- Não houve",
    "",
    "PAUTA",
    input.agendaItems.map((item, index) => `${index + 1}. ${item.title}${item.description ? ` - ${item.description}` : ""}`).join("\n") ||
      "Sem itens de pauta.",
    "",
    "DISCUSSÕES",
    input.discussions
      .map((record) => `- ${record.title}: ${publicOnly ? redactConfidentialText(record.content, Boolean(record.confidential), record.publicSummary) : record.content}`)
      .join("\n") || "Sem discussões registradas.",
    "",
    "ESTUDANTES DISCUTIDOS",
    input.studentCases
      .map((record) => `- ${record.studentName}: ${publicOnly ? redactConfidentialText(record.summary, Boolean(record.confidential), record.publicSummary) : record.summary}`)
      .join("\n") || "Sem estudantes registrados.",
    "",
    "ENCAMINHAMENTOS",
    input.actionItems
      .map((item) => `- ${item.title}. Responsável: ${item.responsibleName}. Prazo: ${formatDate(item.dueDate)}.${item.description ? ` ${item.description}` : ""}`)
      .join("\n") || "Sem encaminhamentos registrados.",
    "",
    "DELIBERAÇÕES E VOTOS",
    input.deliberations.map(formatDeliberation).join("\n") || "Sem deliberações registradas."
  ].join("\n");
}

function formatDeliberation(deliberation: MinuteInput["deliberations"][number]) {
  const votes = deliberation.votes?.length
    ? ` Votos: ${deliberation.votes.map((vote) => `${vote.voterName}=${vote.choice}`).join(", ")}.`
    : "";
  return `- ${deliberation.title}: ${deliberation.decision} (${deliberation.status}).${votes}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}
