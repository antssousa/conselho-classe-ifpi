import { describe, expect, it } from "vitest";
import { DEFAULT_PERSON_IMAGE, filterPeople, personImage, studentImage } from "./people";

const people = [
  { name: "Direcao Geral", email: "direcao@ifpi.edu.br", role: "DIRECAO", title: "Direcao", imageUrl: null },
  { name: "Docente Programacao", email: "docente2@ifpi.edu.br", role: "DOCENTE", title: "Docente", imageUrl: "/foto.png" }
];

describe("people helpers", () => {
  it("uses default image when user has no photo", () => {
    expect(personImage(null)).toBe(DEFAULT_PERSON_IMAGE);
    expect(personImage("")).toBe(DEFAULT_PERSON_IMAGE);
    expect(studentImage(null)).toBe(DEFAULT_PERSON_IMAGE);
  });

  it("keeps custom user photo when available", () => {
    expect(personImage("/foto.png")).toBe("/foto.png");
  });

  it("filters people by name, email, role or title", () => {
    expect(filterPeople(people, "programacao")).toHaveLength(1);
    expect(filterPeople(people, "direcao@ifpi")).toHaveLength(1);
    expect(filterPeople(people, "docente")).toHaveLength(1);
  });
});
