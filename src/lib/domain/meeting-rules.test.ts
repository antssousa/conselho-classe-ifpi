import { describe, expect, it } from "vitest";
import {
  assertActionItemCanBeSaved,
  assertMeetingCanBeOpened,
  assertMeetingCanBePubliclyFinalized,
  assertMinuteCanBeGenerated,
  assertMinuteCanBeSigned,
  assertMinuteCanBeUpdated,
  assertPresentParticipantCanAct,
  calculateContentHash,
  calculateQuorum,
  redactConfidentialText
} from "./meeting-rules";

const participants = [
  { role: "PRESIDENT", present: true },
  { role: "SECRETARY", present: true },
  { role: "TEACHER", present: false }
];

describe("meeting rules", () => {
  it("requires president and secretary before opening a meeting", () => {
    expect(() => assertMeetingCanBeOpened([{ role: "PRESIDENT", present: false }])).toThrow(
      "presidente e secretário"
    );
  });

  it("requires registered attendance before minute generation", () => {
    expect(() => assertMinuteCanBeGenerated([{ role: "TEACHER", present: false }])).toThrow(
      "presença"
    );
  });

  it("calculates quorum automatically from present participants", () => {
    expect(calculateQuorum(participants, 2)).toEqual({
      present: 2,
      eligible: 3,
      minimum: 2,
      reached: true
    });
  });

  it("blocks final meeting with student representative present", () => {
    expect(() =>
      assertMeetingCanBePubliclyFinalized([
        ...participants,
        { role: "STUDENT_REPRESENTATIVE", present: true }
      ])
    ).toThrow("representante discente");
  });

  it("does not save action item without responsible user and due date", () => {
    expect(() => assertActionItemCanBeSaved("", "")).toThrow("responsável e prazo");
  });

  it("redacts confidential records from public minute content", () => {
    expect(redactConfidentialText("Histórico completo", true, "Resumo público")).toBe("Resumo público");
    expect(redactConfidentialText("Histórico completo", true)).toBe("[Registro sigiloso omitido]");
  });

  it("requires read approval before signature", () => {
    expect(() => assertMinuteCanBeSigned("DRAFT")).toThrow("lida/aprovada");
  });

  it("requires authenticated user to be a present participant before personal actions", () => {
    expect(() => assertPresentParticipantCanAct([{ userId: "u1", present: true }], "u1")).not.toThrow();
    expect(() => assertPresentParticipantCanAct([{ userId: "u1", present: false }], "u1")).toThrow("participante presente");
    expect(() => assertPresentParticipantCanAct([{ userId: "u1", present: true }], "u2")).toThrow("participante presente");
  });

  it("produces stable content hash for signatures", () => {
    expect(calculateContentHash("Ata")).toBe(calculateContentHash("Ata"));
    expect(calculateContentHash("Ata")).not.toBe(calculateContentHash("Outra ata"));
  });

  it("blocks editing finalized minute without reopening reason", () => {
    expect(() => assertMinuteCanBeUpdated("FINALIZED")).toThrow("reabertura");
    expect(() => assertMinuteCanBeUpdated("FINALIZED", "Correção formal")).not.toThrow();
  });
}
);
