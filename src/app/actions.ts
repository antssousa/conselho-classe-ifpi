"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { clearSession, createSession, requireUser, verifyPassword } from "@/lib/auth";
import { generateMinuteText } from "@/lib/domain/minute-generator";
import {
  assertActionItemCanBeSaved,
  assertMeetingCanBeOpened,
  assertMeetingCanBePubliclyFinalized,
  assertMinuteCanBeGenerated,
  assertMinuteCanBeSigned,
  assertMinuteCanBeUpdated,
  assertPresentParticipantCanAct,
  assertQuorumReached,
  calculateContentHash
} from "@/lib/domain/meeting-rules";
import { prisma } from "@/lib/prisma";

export async function loginAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail("E-mail ou senha inválidos.");
    }

    await createSession(user.id);
  } catch (error) {
    return fail(messageFor(error));
  }

  redirect("/");
}

export async function logoutAction() {
  clearSession();
  redirect("/login");
}

export async function createReferenceAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const kind = text(formData, "kind");

    if (kind === "campus") {
      await prisma.campus.create({ data: { name: text(formData, "name"), city: text(formData, "city") } });
      revalidatePath("/cadastros");
      return ok("Campus cadastrado.");
    }

    if (kind === "course") {
      await prisma.course.create({ data: { name: text(formData, "name"), campusId: text(formData, "campusId") } });
      revalidatePath("/cadastros");
      return ok("Curso cadastrado.");
    }

    if (kind === "classGroup") {
      await prisma.classGroup.create({
        data: { name: text(formData, "name"), year: Number(text(formData, "year")), courseId: text(formData, "courseId") }
      });
      revalidatePath("/cadastros");
      return ok("Turma cadastrada.");
    }

    return fail("Tipo de cadastro inválido.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function updateReferenceAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const kind = text(formData, "kind");
    const id = text(formData, "id");

    if (kind === "campus") {
      await prisma.campus.update({
        where: { id },
        data: { name: text(formData, "name"), city: text(formData, "city") }
      });
      revalidatePath("/cadastros");
      return ok("Campus atualizado.");
    }

    if (kind === "course") {
      await prisma.course.update({
        where: { id },
        data: { name: text(formData, "name"), campusId: text(formData, "campusId") }
      });
      revalidatePath("/cadastros");
      return ok("Curso atualizado.");
    }

    if (kind === "classGroup") {
      await prisma.classGroup.update({
        where: { id },
        data: { name: text(formData, "name"), year: Number(text(formData, "year")), courseId: text(formData, "courseId") }
      });
      revalidatePath("/cadastros");
      return ok("Turma atualizada.");
    }

    return fail("Tipo de cadastro inválido.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function deleteReferenceAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const kind = text(formData, "kind");
    const id = text(formData, "id");

    if (kind === "campus") {
      const campus = await prisma.campus.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { courses: true, meetings: true } } }
      });
      if (campus._count.courses > 0) return fail("Existem cursos vinculados a este campus.");
      if (campus._count.meetings > 0) return fail("Existem reuniões vinculadas a este campus.");
      await prisma.campus.delete({ where: { id } });
      revalidatePath("/cadastros");
      return ok("Campus removido.");
    }

    if (kind === "course") {
      const course = await prisma.course.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { classGroups: true, meetings: true } } }
      });
      if (course._count.classGroups > 0) return fail("Existem turmas vinculadas a este curso.");
      if (course._count.meetings > 0) return fail("Existem reuniões vinculadas a este curso.");
      await prisma.course.delete({ where: { id } });
      revalidatePath("/cadastros");
      return ok("Curso removido.");
    }

    if (kind === "classGroup") {
      const group = await prisma.classGroup.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { meetings: true } } }
      });
      if (group._count.meetings > 0) return fail("Existem reuniões vinculadas a esta turma.");
      await prisma.classGroup.delete({ where: { id } });
      revalidatePath("/cadastros");
      return ok("Turma removida.");
    }

    return fail("Tipo de cadastro inválido.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function createStudentAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const classGroupId = text(formData, "classGroupId");
    const name = text(formData, "name");
    if (!classGroupId || !name) {
      return fail("Informe a turma e o nome do aluno.");
    }
    await prisma.student.create({
      data: { classGroupId, name, photoUrl: optionalText(formData, "photoUrl") }
    });
    revalidatePath("/cadastros");
    return ok("Aluno cadastrado.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function updateStudentAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const id = text(formData, "id");
    const name = text(formData, "name");
    if (!id || !name) {
      return fail("Informe o aluno e o nome.");
    }
    await prisma.student.update({
      where: { id },
      data: { name, photoUrl: optionalText(formData, "photoUrl") }
    });
    revalidatePath("/cadastros");
    return ok("Aluno atualizado.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function deleteStudentAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const id = text(formData, "id");
    const student = await prisma.student.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { studentCases: true, actionItems: true } } }
    });
    if (student._count.studentCases > 0) return fail("Aluno possui casos registrados em reuniões.");
    if (student._count.actionItems > 0) return fail("Aluno possui encaminhamentos registrados.");
    await prisma.student.delete({ where: { id } });
    revalidatePath("/cadastros");
    return ok("Aluno removido.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function createMeetingAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  let meetingId: string;

  try {
    const user = await requireUser();
    const parsed = z
      .object({
        title: z.string().min(3, "Informe um título com ao menos 3 caracteres."),
        scheduledAt: z.string().min(1, "Informe data e hora."),
        location: z.string().min(2, "Informe o local."),
        purpose: z.string().optional(),
        quorumMinimum: z.coerce.number().int().min(1),
        campusId: z.string().min(1),
        courseId: z.string().min(1),
        classGroupId: z.string().min(1)
      })
      .parse(Object.fromEntries(formData));

    const meeting = await prisma.meeting.create({
      data: {
        ...parsed,
        scheduledAt: new Date(parsed.scheduledAt)
      }
    });
    await audit("MEETING_CREATED", "Meeting", meeting.id, "Reunião criada.", user.id, meeting.id);
    meetingId = meeting.id;
  } catch (error) {
    return fail(messageFor(error));
  }

  redirect(`/meetings/${meetingId}`);
}

export async function addParticipantAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    await prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId, userId: text(formData, "userId") } },
      update: { role: text(formData, "role") as never },
      create: { meetingId, userId: text(formData, "userId"), role: text(formData, "role") as never }
    });
    await audit("PARTICIPANT_ADDED", "Meeting", meetingId, "Participante adicionado ou atualizado.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Participante adicionado.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function callMeetingAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "CALLED", participants: { updateMany: { where: { invitedAt: null }, data: { invitedAt: new Date() } } } }
    });
    await audit("MEETING_CALLED", "Meeting", meetingId, "Convocação registrada.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Reunião convocada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function openMeetingAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const [meeting, participants] = await Promise.all([
      prisma.meeting.findUniqueOrThrow({ where: { id: meetingId }, select: { quorumMinimum: true } }),
      prisma.meetingParticipant.findMany({ where: { meetingId }, select: { role: true, present: true } })
    ]);
    assertMeetingCanBeOpened(participants);
    assertQuorumReached(participants, meeting.quorumMinimum);
    await prisma.meeting.update({ where: { id: meetingId }, data: { status: "OPEN" } });
    await audit("MEETING_OPENED", "Meeting", meetingId, "Reunião aberta.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Reunião aberta.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function updatePresenceAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const participantId = text(formData, "participantId");
    const meetingId = text(formData, "meetingId");
    const present = formData.get("present") === "on";
    await prisma.meetingParticipant.update({
      where: { id: participantId },
      data: { present, presentAt: present ? new Date() : null }
    });
    await audit("ATTENDANCE_UPDATED", "MeetingParticipant", participantId, "Presença atualizada.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Presença salva.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function addAgendaItemAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const meetingId = text(formData, "meetingId");
    await prisma.agendaItem.create({
      data: { meetingId, title: text(formData, "title"), description: optionalText(formData, "description") }
    });
    revalidateMeeting(meetingId);
    return ok("Pauta adicionada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function addDiscussionAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const meetingId = text(formData, "meetingId");
    await assertMinuteEditable(meetingId);
    await prisma.discussionRecord.create({
      data: {
        meetingId,
        agendaItemId: optionalText(formData, "agendaItemId"),
        title: text(formData, "title"),
        content: text(formData, "content"),
        publicSummary: optionalText(formData, "publicSummary"),
        confidential: formData.get("confidential") === "on"
      }
    });
    revalidateMeeting(meetingId);
    return ok("Discussão registrada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function addStudentCaseAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const meetingId = text(formData, "meetingId");
    await assertMinuteEditable(meetingId);

    const studentId = optionalText(formData, "studentId");
    let studentName = text(formData, "studentName");
    let photoUrl = optionalText(formData, "photoUrl");

    if (studentId) {
      const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
      studentName = student.name;
      photoUrl = photoUrl || student.photoUrl;
    }

    if (!studentName) {
      return fail("Selecione um aluno da turma ou informe o nome.");
    }

    await prisma.studentCase.create({
      data: {
        meetingId,
        studentId,
        studentName,
        registration: optionalText(formData, "registration"),
        photoUrl,
        summary: text(formData, "summary"),
        publicSummary: optionalText(formData, "publicSummary"),
        confidential: formData.get("confidential") !== "off"
      }
    });
    revalidateMeeting(meetingId);
    return ok("Estudante registrado.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function addActionItemAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const meetingId = text(formData, "meetingId");
    const responsibleUserId = text(formData, "responsibleUserId");
    const dueDate = text(formData, "dueDate");
    assertActionItemCanBeSaved(responsibleUserId, dueDate);
    await prisma.actionItem.create({
      data: {
        meetingId,
        studentId: optionalText(formData, "studentId"),
        title: text(formData, "title"),
        description: optionalText(formData, "description"),
        responsibleUserId,
        dueDate: new Date(dueDate)
      }
    });
    revalidateMeeting(meetingId);
    return ok("Encaminhamento salvo.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function addDeliberationAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const meetingId = text(formData, "meetingId");
    await prisma.deliberation.create({
      data: {
        meetingId,
        title: text(formData, "title"),
        decision: text(formData, "decision"),
        status: text(formData, "status") as never,
        requiresVote: formData.get("requiresVote") === "on"
      }
    });
    revalidateMeeting(meetingId);
    return ok("Deliberação salva.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function addVoteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const participants = await prisma.meetingParticipant.findMany({ where: { meetingId }, select: { userId: true, present: true } });
    assertPresentParticipantCanAct(participants, user.id);
    await prisma.vote.upsert({
      where: { deliberationId_userId: { deliberationId: text(formData, "deliberationId"), userId: user.id } },
      update: { choice: text(formData, "choice") as never, justification: optionalText(formData, "justification") },
      create: {
        deliberationId: text(formData, "deliberationId"),
        userId: user.id,
        choice: text(formData, "choice") as never,
        justification: optionalText(formData, "justification")
      }
    });
    await audit("OPEN_VOTE_RECORDED", "Deliberation", text(formData, "deliberationId"), "Voto aberto registrado.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Voto registrado.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function generateMinuteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const meeting = await getMeetingForMinute(meetingId);
    assertMinuteCanBeGenerated(meeting.participants);
    const generated = generateMinuteText(toMinuteInput(meeting));
    const minute = await prisma.minute.upsert({
      where: { meetingId },
      update: {
        content: generated.content,
        publicContent: generated.publicContent,
        contentHash: generated.contentHash,
        versions: {
          create: { content: generated.content, reason: "Regeneração automática", version: (meeting.minute?.versions.length || 0) + 1 }
        }
      },
      create: { meetingId, ...generated }
    });
    await audit("MINUTE_GENERATED", "Minute", minute.id, "Ata gerada automaticamente.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Ata gerada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function updateMinuteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const minute = await prisma.minute.findUniqueOrThrow({ where: { meetingId }, include: { versions: true } });
    const reason = optionalText(formData, "reason");
    assertMinuteCanBeUpdated(minute.status, reason);
    const content = text(formData, "content");
    await prisma.minute.update({
      where: { id: minute.id },
      data: {
        content,
        publicContent: content,
        status: minute.status === "FINALIZED" ? "REOPENED" : minute.status,
        contentHash: calculateContentHash(content),
        versions: { create: { content, reason: reason || "Edição manual", version: minute.versions.length + 1 } }
      }
    });
    await audit("MINUTE_UPDATED", "Minute", minute.id, "Ata editada.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Ata atualizada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function approveMinuteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const minute = await prisma.minute.update({
      where: { meetingId },
      data: { status: "READ_APPROVED", approvedAt: new Date() }
    });
    await audit("MINUTE_READ_APPROVED", "Minute", minute.id, "Ata marcada como lida e aprovada.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Ata marcada como lida e aprovada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function signMinuteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const minute = await prisma.minute.findUniqueOrThrow({ where: { meetingId } });
    assertMinuteCanBeSigned(minute.status);
    const participant = await prisma.meetingParticipant.findFirstOrThrow({
      where: { meetingId, userId: user.id, present: true }
    });
    await prisma.minuteSignature.create({
      data: {
        minuteId: minute.id,
        userId: participant.userId,
        participantId: participant.id,
        contentHash: minute.contentHash,
        acceptedText: "Li, aprovei e aceito assinar eletronicamente esta ata."
      }
    });
    await audit("MINUTE_SIGNED", "Minute", minute.id, "Assinatura eletrônica registrada com hash da ata.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Assinatura registrada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function finalizeMinuteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const participants = await prisma.meetingParticipant.findMany({ where: { meetingId }, select: { role: true, present: true } });
    assertMeetingCanBePubliclyFinalized(participants);
    const minute = await prisma.minute.update({
      where: { meetingId },
      data: { status: "FINALIZED", finalizedAt: new Date(), meeting: { update: { status: "FINALIZED" } } }
    });
    await audit("MINUTE_FINALIZED", "Minute", minute.id, "Ata finalizada.", user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Ata finalizada.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

export async function reopenMinuteAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const meetingId = text(formData, "meetingId");
    const reason = text(formData, "reason");
    if (!reason) {
      return fail("Informe a justificativa para reabertura.");
    }
    const minute = await prisma.minute.update({
      where: { meetingId },
      data: { status: "REOPENED", meeting: { update: { status: "REOPENED", reopenedReason: reason } } }
    });
    await audit("MINUTE_REOPENED", "Minute", minute.id, reason, user.id, meetingId);
    revalidateMeeting(meetingId);
    return ok("Ata reaberta.");
  } catch (error) {
    return fail(messageFor(error));
  }
}

async function assertMinuteEditable(meetingId: string) {
  const minute = await prisma.minute.findUnique({ where: { meetingId } });
  if (minute?.status === "FINALIZED") {
    throw new Error("Ata finalizada não pode receber novos registros sem reabertura.");
  }
}

async function getMeetingForMinute(meetingId: string) {
  return prisma.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: {
      campus: true,
      course: true,
      classGroup: true,
      participants: { include: { user: true }, orderBy: { createdAt: "asc" } },
      agendaItems: { orderBy: { createdAt: "asc" } },
      discussions: { orderBy: { createdAt: "asc" } },
      studentCases: { orderBy: { createdAt: "asc" } },
      actionItems: { include: { responsibleUser: true, student: true }, orderBy: { createdAt: "asc" } },
      deliberations: { include: { votes: { include: { user: true } } }, orderBy: { createdAt: "asc" } },
      minute: { include: { versions: true } }
    }
  });
}

function toMinuteInput(meeting: Awaited<ReturnType<typeof getMeetingForMinute>>) {
  return {
    title: meeting.title,
    campus: meeting.campus.name,
    course: meeting.course.name,
    classGroup: meeting.classGroup.name,
    scheduledAt: meeting.scheduledAt,
    location: meeting.location,
    participants: meeting.participants.map((participant) => ({
      name: participant.user.name,
      role: participant.role,
      present: participant.present
    })),
    agendaItems: meeting.agendaItems,
    discussions: meeting.discussions,
    studentCases: meeting.studentCases,
    actionItems: meeting.actionItems.map((item) => ({
      title: item.title,
      description: item.description,
      responsibleName: item.responsibleUser.name,
      studentName: item.student?.name,
      dueDate: item.dueDate
    })),
    deliberations: meeting.deliberations.map((deliberation) => ({
      title: deliberation.title,
      decision: deliberation.decision,
      status: deliberation.status,
      votes: deliberation.votes.map((vote) => ({
        voterName: vote.user.name,
        choice: vote.choice,
        justification: vote.justification
      }))
    }))
  };
}

async function audit(event: string, entityType: string, entityId: string, message: string, userId?: string, meetingId?: string) {
  await prisma.auditLog.create({
    data: { event, entityType, entityId, message, userId, meetingId }
  });
}

function revalidateMeeting(meetingId: string) {
  revalidatePath(`/meetings/${meetingId}`);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function messageFor(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "Dados inválidos.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Erro inesperado. Tente novamente.";
}
