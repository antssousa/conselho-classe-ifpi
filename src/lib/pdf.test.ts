import { describe, expect, it } from "vitest";
import { textToPdfBuffer } from "./pdf";

describe("textToPdfBuffer", () => {
  it("uses WinAnsi encoding for the Helvetica font", () => {
    const pdf = textToPdfBuffer("Ata", "Conteúdo").toString("latin1");
    expect(pdf).toContain("/Encoding /WinAnsiEncoding");
  });

  it("encodes Portuguese accents as WinAnsi octal escapes", () => {
    const pdf = textToPdfBuffer("Ata", "ação discussão").toString("latin1");
    // a = 0xE3 -> \343, c = 0xE7 -> \347, a~o = 0xE3 -> \343
    expect(pdf).toContain("\\347"); // ç
    expect(pdf).toContain("\\343"); // ã
  });

  it("falls back to '?' for characters outside WinAnsi", () => {
    const pdf = textToPdfBuffer("Ata", "emoji \u{1F600}").toString("latin1");
    expect(pdf).toContain("(emoji ?)");
  });

  it("escapes PDF metacharacters", () => {
    const pdf = textToPdfBuffer("Ata", "valor (com parênteses) e \\barra").toString("latin1");
    expect(pdf).toContain("\\(com");
    expect(pdf).toContain("par\\352nteses\\)"); // ê = 0xEA -> \352
    expect(pdf).toContain("\\\\barra");
  });
});
