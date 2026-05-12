import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const campus = await prisma.campus.upsert({
    where: { name: "Campus Parnaíba" },
    update: {},
    create: { name: "Campus Parnaíba", city: "Parnaíba" }
  });

  const course = await prisma.course.upsert({
    where: { id: "seed-course-informatica" },
    update: { campusId: campus.id },
    create: {
      id: "seed-course-informatica",
      name: "Curso Técnico em Informática Integrado ao Ensino Médio",
      campusId: campus.id
    }
  });

  await prisma.classGroup.upsert({
    where: { id: "seed-class-1-info-2026" },
    update: { courseId: course.id },
    create: {
      id: "seed-class-1-info-2026",
      name: "1º Ano Informática 2026",
      year: 2026,
      courseId: course.id
    }
  });

  const users: Array<{ name: string; email: string; role: string; title: string }> = [
    { name: "Admin IFPI", email: "admin@ifpi.edu.br", role: "ADMIN", title: "Administrador" },
    { name: "Direção Geral", email: "direcao@ifpi.edu.br", role: "DIRECAO", title: "Direção" },
    { name: "Coordenação do Curso", email: "coordenacao@ifpi.edu.br", role: "COORDENACAO", title: "Coordenação" },
    { name: "Setor Pedagógico", email: "pedagogico@ifpi.edu.br", role: "PEDAGOGICO", title: "Pedagógico" },
    { name: "Secretário Escolar", email: "secretario@ifpi.edu.br", role: "SECRETARIO", title: "Secretário" },
    { name: "Docente Matemática", email: "docente1@ifpi.edu.br", role: "DOCENTE", title: "Docente" },
    { name: "Docente Programação", email: "docente2@ifpi.edu.br", role: "DOCENTE", title: "Docente" }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: {
        ...user,
        passwordHash: hashPassword("ifpi123")
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
