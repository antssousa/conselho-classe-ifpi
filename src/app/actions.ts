"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearSession, createSession, requireUser, verifyPassword } from "@/lib/auth";
import { generateMinuteText } from "@/lib/domain/minute-generator";
import {
  assertActionItemCanBeSaved,
  assertMeetingCanBeOpened,
  assertMeetingCanBePubliclyFinalized,
  assertMinuteCanBeGenerated,
  assertMinuteCanBeSigned,
  assertMinuteCanBeUpdated,
  calculateContentHash
} from "@/lib/domain/meeting-rules";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=1");
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  clearSession();
  redirect("/login");
}

export async function createReferenceAction(formData: FormData) {
  await requireUser();
  const kind = text(formData, "kind");

  if (kind === "campus") {
    await prisma.campus.create({ data: { name: text(formData, "name"), city: text(formData, "city") } });
  }

  if (kind === "course") {
    await prisma.course.create({ data: { name: text(formData, "name"), campusId: text(formData, "campusId") } });
  }

  if (kind === "classGroup") {
    await prisma.classGroup.create({
      data: { name: text(formData, "name"), year: Number(text(formData, "year")), courseId: text(formData, "courseId") }
    });
  }

  revalidatePath("/cadastros");
}

export async function createMeetingAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z
    .object({
      title: z.string().min(3),
      scheduledAt: z.string().min(1),
      location: z.string().min(2),
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
  redirect(`/meetings/${meeting.id}`);
}

export async function addParticipantAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId, userId: text(formData, "userId") } },
    update: { role: text(formData, "role") as never },
    create: { meetingId, userId: text(formData, "userId"), role: text(formData, "role") as never }
  });
  await audit("PARTICIPANT_ADDED", "Meeting", meetingId, "Participante adicionado ou atualizado.", user.id, meetingId);
  revalidateMeeting(meetingId);
}

export async function callMeetingAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "CALLED", participants: { updateMany: { where: { invitedAt: null }, data: { invitedAt: new Date() } } } }
  });
  await audit("MEETING_CALLED", "Meeting", meetingId, "Convocação registrada.", user.id, meetingId);
  revalidateMeeting(meetingId);
}

export async function openMeetingAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  const participants = await prisma.meetingParticipant.findMany({ where: { meetingId }, select: { role: true, present: true } });
  assertMeetingCanBeOpened(participants);
  await prisma.meeting.update({ where: { id: meetingId }, data: { status: "OPEN" } });
  await audit("MEETING_OPENED", "Meeting", meetingId, "Reunião aberta.", user.id, meetingId);
  revalidateMeeting(meetingId);
}

export async function updatePresenceAction(formData: FormData) {
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
}

export async function addAgendaItemAction(formData: FormData) {
  await requireUser();
  const meetingId = text(formData, "meetingId");
  await prisma.agendaItem.create({
    data: { meetingId, title: text(formData, "title"), description: optionalText(formData, "description") }
  });
  revalidateMeeting(meetingId);
}

export async function addDiscussionAction(formData: FormData) {
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
}

export async function addStudentCaseAction(formData: FormData) {
  await requireUser();
  const meetingId = text(formData, "meetingId");
  await assertMinuteEditable(meetingId);
  await prisma.studentCase.create({
    data: {
      meetingId,
      studentName: text(formData, "studentName"),
      registration: optionalText(formData, "registration"),
      photoUrl: optionalText(formData, "photoUrl"),
      summary: text(formData, "summary"),
      publicSummary: optionalText(formData, "publicSummary"),
      confidential: formData.get("confidential") !== "off"
    }
  });
  revalidateMeeting(meetingId);
}

export async function addActionItemAction(formData: FormData) {
  await requireUser();
  const meetingId = text(formData, "meetingId");
  const responsibleUserId = text(formData, "responsibleUserId");
  const dueDate = text(formData, "dueDate");
  assertActionItemCanBeSaved(responsibleUserId, dueDate);
  await prisma.actionItem.create({
    data: {
      meetingId,
      title: text(formData, "title"),
      description: optionalText(formData, "description"),
      responsibleUserId,
      dueDate: new Date(dueDate)
    }
  });
  revalidateMeeting(meetingId);
}

export async function addDeliberationAction(formData: FormData) {
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
}

export async function addVoteAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  await prisma.vote.upsert({
    where: { deliberationId_userId: { deliberationId: text(formData, "deliberationId"), userId: text(formData, "userId") } },
    update: { choice: text(formData, "choice") as never, justification: optionalText(formData, "justification") },
    create: {
      deliberationId: text(formData, "deliberationId"),
      userId: text(formData, "userId"),
      choice: text(formData, "choice") as never,
      justification: optionalText(formData, "justification")
    }
  });
  await audit("OPEN_VOTE_RECORDED", "Deliberation", text(formData, "deliberationId"), "Voto aberto registrado.", user.id, meetingId);
  revalidateMeeting(meetingId);
}

export async function generateMinuteAction(formData: FormData) {
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
}

export async function updateMinuteAction(formData: FormData) {
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
}

export async function approveMinuteAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  const minute = await prisma.minute.update({
    where: { meetingId },
    data: { status: "READ_APPROVED", approvedAt: new Date() }
  });
  await audit("MINUTE_READ_APPROVED", "Minute", minute.id, "Ata marcada como lida e aprovada.", user.id, meetingId);
  revalidateMeeting(meetingId);
}

export async function signMinuteAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  const minute = await prisma.minute.findUniqueOrThrow({ where: { meetingId } });
  assertMinuteCanBeSigned(minute.status);
  const participant = await prisma.meetingParticipant.findFirstOrThrow({
    where: { meetingId, userId: text(formData, "userId"), present: true }
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
}

export async function finalizeMinuteAction(formData: FormData) {
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
}

export async function reopenMinuteAction(formData: FormData) {
  const user = await requireUser();
  const meetingId = text(formData, "meetingId");
  const reason = text(formData, "reason");
  const minute = await prisma.minute.update({
    where: { meetingId },
    data: { status: "REOPENED", meeting: { update: { status: "REOPENED", reopenedReason: reason } } }
  });
  await audit("MINUTE_REOPENED", "Minute", minute.id, reason, user.id, meetingId);
  revalidateMeeting(meetingId);
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
      actionItems: { include: { responsibleUser: true }, orderBy: { createdAt: "asc" } },
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
