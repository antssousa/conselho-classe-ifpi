import { createHash } from "crypto";

export type ParticipantLike = {
  role: string;
  present: boolean;
};

export type UserParticipantLike = {
  userId: string;
  present: boolean;
};

export type QuorumResult = {
  present: number;
  eligible: number;
  minimum: number;
  reached: boolean;
};

export function assertMeetingCanBeOpened(participants: ParticipantLike[]) {
  const hasPresident = participants.some((participant) => participant.role === "PRESIDENT");
  const hasSecretary = participants.some((participant) => participant.role === "SECRETARY");

  if (!hasPresident || !hasSecretary) {
    throw new Error("Não é possível abrir a reunião sem presidente e secretário.");
  }
}

export function assertMinuteCanBeGenerated(participants: ParticipantLike[]) {
  if (!participants.some((participant) => participant.present)) {
    throw new Error("Não é possível gerar ata sem registro de presença.");
  }
}

export function calculateQuorum(participants: ParticipantLike[], minimum: number): QuorumResult {
  const eligible = participants.length;
  const present = participants.filter((participant) => participant.present).length;

  return {
    present,
    eligible,
    minimum,
    reached: present >= minimum
  };
}

export function assertMeetingCanBePubliclyFinalized(participants: ParticipantLike[]) {
  const hasStudentRepresentative = participants.some(
    (participant) => participant.role === "STUDENT_REPRESENTATIVE" && participant.present
  );

  if (hasStudentRepresentative) {
    throw new Error("Reunião final não pode ser finalizada com representante discente presente.");
  }
}

export function assertActionItemCanBeSaved(responsibleUserId?: string | null, dueDate?: string | Date | null) {
  if (!responsibleUserId || !dueDate) {
    throw new Error("Não é possível salvar encaminhamento sem responsável e prazo.");
  }
}

export function redactConfidentialText(content: string, confidential: boolean, publicSummary?: string | null) {
  if (!confidential) {
    return content;
  }

  return publicSummary?.trim() || "[Registro sigiloso omitido]";
}

export function assertMinuteCanBeSigned(status: string) {
  if (status !== "READ_APPROVED") {
    throw new Error("Ata precisa ser marcada como lida/aprovada antes de assinatura.");
  }
}

export function assertPresentParticipantCanAct(participants: UserParticipantLike[], userId: string) {
  const participant = participants.find((item) => item.userId === userId);

  if (!participant?.present) {
    throw new Error("A acao exige um participante presente na reuniao.");
  }
}

export function calculateContentHash(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function assertMinuteCanBeUpdated(status: string, reopenReason?: string | null) {
  if (status === "FINALIZED" && !reopenReason?.trim()) {
    throw new Error("Ata finalizada não pode ser editada sem reabertura com justificativa.");
  }
}
