import { describe, expect, it } from "vitest";
import { generateMinuteText } from "./minute-generator";

describe("minute generator", () => {
  it("generates public minute without full confidential records", () => {
    const minute = generateMinuteText({
      title: "Conselho 1A",
      campus: "Campus Parnaíba",
      course: "Técnico em Informática",
      classGroup: "1º Ano Informática 2026",
      scheduledAt: new Date("2026-03-02T13:00:00Z"),
      location: "Sala 1",
      participants: [
        { name: "Ana", role: "PRESIDENT", present: true },
        { name: "Bruno", role: "SECRETARY", present: true }
      ],
      agendaItems: [{ title: "Rendimento", description: "Análise geral" }],
      discussions: [
        {
          title: "Caso sensível",
          content: "Detalhes integrais sigilosos",
          confidential: true,
          publicSummary: "Resumo sem exposição"
        }
      ],
      studentCases: [],
      actionItems: [],
      deliberations: []
    });

    expect(minute.publicContent).toContain("Resumo sem exposição");
    expect(minute.publicContent).not.toContain("Detalhes integrais sigilosos");
    expect(minute.content).toContain("Detalhes integrais sigilosos");
  });
});
