import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

const firstNames = ["João", "Maria", "Pedro", "Ana", "Carlos", "Fernanda", "Lucas", "Beatriz", "Rafael", "Camila"];
const lastNames = ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Ferreira", "Gomes", "Alves", "Martins", "Pereira"];

function generateStudents(count: number) {
  const students = [];
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    students.push({
      name: `${firstName} ${lastName} ${i}`,
      photoUrl: null
    });
  }
  return students;
}

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // Campuses
  const campuses = await Promise.all([
    prisma.campus.upsert({
      where: { name: "Campus Parnaíba" },
      update: {},
      create: { name: "Campus Parnaíba", city: "Parnaíba" }
    }),
    prisma.campus.upsert({
      where: { name: "Campus Teresina" },
      update: {},
      create: { name: "Campus Teresina", city: "Teresina" }
    }),
    prisma.campus.upsert({
      where: { name: "Campus Piripiri" },
      update: {},
      create: { name: "Campus Piripiri", city: "Piripiri" }
    })
  ]);
  console.log(`✓ ${campuses.length} campus criados`);

  // Courses
  const courses = await Promise.all([
    prisma.course.upsert({
      where: { id: "seed-course-informatica" },
      update: { campusId: campuses[0].id },
      create: {
        id: "seed-course-informatica",
        name: "Técnico em Informática",
        campusId: campuses[0].id
      }
    }),
    prisma.course.upsert({
      where: { id: "seed-course-eletrotecnica" },
      update: { campusId: campuses[0].id },
      create: {
        id: "seed-course-eletrotecnica",
        name: "Técnico em Eletrotécnica",
        campusId: campuses[0].id
      }
    }),
    prisma.course.upsert({
      where: { id: "seed-course-mecanica" },
      update: { campusId: campuses[1].id },
      create: {
        id: "seed-course-mecanica",
        name: "Técnico em Mecânica",
        campusId: campuses[1].id
      }
    }),
    prisma.course.upsert({
      where: { id: "seed-course-administracao" },
      update: { campusId: campuses[2].id },
      create: {
        id: "seed-course-administracao",
        name: "Técnico em Administração",
        campusId: campuses[2].id
      }
    })
  ]);
  console.log(`✓ ${courses.length} cursos criados`);

  // Class Groups
  const classGroups = await Promise.all([
    prisma.classGroup.upsert({
      where: { id: "seed-class-1-info-2026" },
      update: { courseId: courses[0].id },
      create: {
        id: "seed-class-1-info-2026",
        name: "1º Ano Informática 2026",
        year: 2026,
        courseId: courses[0].id
      }
    }),
    prisma.classGroup.upsert({
      where: { id: "seed-class-2-info-2025" },
      update: { courseId: courses[0].id },
      create: {
        id: "seed-class-2-info-2025",
        name: "2º Ano Informática 2025",
        year: 2025,
        courseId: courses[0].id
      }
    }),
    prisma.classGroup.upsert({
      where: { id: "seed-class-1-eletro-2026" },
      update: { courseId: courses[1].id },
      create: {
        id: "seed-class-1-eletro-2026",
        name: "1º Ano Eletrotécnica 2026",
        year: 2026,
        courseId: courses[1].id
      }
    }),
    prisma.classGroup.upsert({
      where: { id: "seed-class-1-mecanica-2026" },
      update: { courseId: courses[2].id },
      create: {
        id: "seed-class-1-mecanica-2026",
        name: "1º Ano Mecânica 2026",
        year: 2026,
        courseId: courses[2].id
      }
    })
  ]);
  console.log(`✓ ${classGroups.length} turmas criadas`);

  // Students
  for (const classGroup of classGroups) {
    const existingCount = await prisma.student.count({ where: { classGroupId: classGroup.id } });
    if (existingCount === 0) {
      const students = generateStudents(25);
      await prisma.student.createMany({
        data: students.map((s) => ({
          ...s,
          classGroupId: classGroup.id
        }))
      });
      console.log(`✓ 25 alunos criados em ${classGroup.name}`);
    }
  }

  // Users
  const users: Array<{ name: string; email: string; role: string; title: string }> = [
    { name: "Admin IFPI", email: "admin@ifpi.edu.br", role: "ADMIN", title: "Administrador" },
    { name: "Diretor Parnaíba", email: "diretor@ifpi.edu.br", role: "DIRECAO", title: "Diretor" },
    { name: "Coordenador Informática", email: "coordenacao@ifpi.edu.br", role: "PRESIDENT", title: "Coordenador" },
    { name: "Coordenador Eletrotécnica", email: "coord.eletro@ifpi.edu.br", role: "PRESIDENT", title: "Coordenador" },
    { name: "Pedagogo", email: "pedagogico@ifpi.edu.br", role: "SECRETARY", title: "Pedagogo" },
    { name: "Secretário Escolar", email: "secretario@ifpi.edu.br", role: "SECRETARY", title: "Secretário" },
    { name: "Prof. Matemática", email: "prof.mat@ifpi.edu.br", role: "TEACHER", title: "Professor" },
    { name: "Prof. Programação", email: "prof.prog@ifpi.edu.br", role: "TEACHER", title: "Professor" },
    { name: "Prof. Inglês", email: "prof.ing@ifpi.edu.br", role: "TEACHER", title: "Professor" },
    { name: "Prof. Circuitos", email: "prof.circ@ifpi.edu.br", role: "TEACHER", title: "Professor" }
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
  console.log(`✓ ${users.length} usuários criados/atualizados`);

  // Get users for meetings
  const coordInfo = await prisma.user.findUniqueOrThrow({ where: { email: "coordenacao@ifpi.edu.br" } });
  const pedagogo = await prisma.user.findUniqueOrThrow({ where: { email: "pedagogico@ifpi.edu.br" } });
  const profMat = await prisma.user.findUniqueOrThrow({ where: { email: "prof.mat@ifpi.edu.br" } });
  const profProg = await prisma.user.findUniqueOrThrow({ where: { email: "prof.prog@ifpi.edu.br" } });

  // Sample Meetings
  const meeting = await prisma.meeting.upsert({
    where: { id: "seed-meeting-1" },
    update: {},
    create: {
      id: "seed-meeting-1",
      title: "Conselho de Classe - 1º Bimestre",
      purpose: "Análise de desempenho e deliberações do 1º bimestre",
      scheduledAt: new Date("2026-05-15T14:00:00"),
      location: "Sala de reuniões - Bloco A",
      status: "OPEN",
      quorumMinimum: 3,
      campusId: campuses[0].id,
      courseId: courses[0].id,
      classGroupId: classGroups[0].id
    }
  });

  // Meeting Participants
  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId: meeting.id, userId: coordInfo.id } },
    update: {},
    create: {
      meetingId: meeting.id,
      userId: coordInfo.id,
      role: "PRESIDENT",
      present: true,
      presentAt: new Date()
    }
  });

  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId: meeting.id, userId: pedagogo.id } },
    update: {},
    create: {
      meetingId: meeting.id,
      userId: pedagogo.id,
      role: "SECRETARY",
      present: true,
      presentAt: new Date()
    }
  });

  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId: meeting.id, userId: profMat.id } },
    update: {},
    create: {
      meetingId: meeting.id,
      userId: profMat.id,
      role: "TEACHER",
      present: true,
      presentAt: new Date()
    }
  });

  await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId: meeting.id, userId: profProg.id } },
    update: {},
    create: {
      meetingId: meeting.id,
      userId: profProg.id,
      role: "TEACHER",
      present: true,
      presentAt: new Date()
    }
  });

  console.log("✓ 4 participantes adicionados à reunião");

  // Sample Student Cases
  const students = await prisma.student.findMany({
    where: { classGroupId: classGroups[0].id },
    take: 3
  });

  for (const student of students) {
    await prisma.studentCase.upsert({
      where: { id: `seed-case-${student.id}` },
      update: {},
      create: {
        id: `seed-case-${student.id}`,
        meetingId: meeting.id,
        studentId: student.id,
        studentName: student.name,
        registration: `2024${Math.floor(Math.random() * 10000)}`,
        photoUrl: null,
        summary: `Desempenho regular. Dificuldades em Matemática. Apresenta assiduidade de 85%. Necessário reforço nas disciplinas de cálculo e álgebra.`,
        publicSummary: `Aluno com desempenho regular. Recomendado reforço escolar.`,
        confidential: true
      }
    });
  }

  console.log(`✓ 3 casos de estudantes criados`);

  // Sample Agenda Items
  const existingItems = await prisma.agendaItem.count({ where: { meetingId: meeting.id } });
  if (existingItems === 0) {
    await prisma.agendaItem.createMany({
      data: [
        {
          meetingId: meeting.id,
          title: "Resultado 1º Bimestre",
          description: "Análise de desempenho geral da turma",
          order: 1
        },
        {
          meetingId: meeting.id,
          title: "Casos Específicos",
          description: "Discussão de alunos com dificuldades",
          order: 2
        },
        {
          meetingId: meeting.id,
          title: "Pontos Positivos",
          description: "Destaque para alunos com bom desempenho",
          order: 3
        }
      ]
    });
  }

  console.log("✓ 3 itens de pauta criados");

  console.log("\n✅ Seed concluído com sucesso!");
  console.log("\n📋 Dados de teste criados:");
  console.log("   • 3 campus");
  console.log("   • 4 cursos");
  console.log("   • 4 turmas com 25 alunos cada");
  console.log("   • 10 usuários (senha: ifpi123)");
  console.log("   • 1 reunião com 4 participantes");
  console.log("   • 3 casos de estudantes");
  console.log("   • 3 itens de pauta\n");
  console.log("🔑 Usuários de teste:");
  console.log("   • admin@ifpi.edu.br (ADMIN)");
  console.log("   • coordenacao@ifpi.edu.br (PRESIDENT)");
  console.log("   • pedagogico@ifpi.edu.br (SECRETARY)");
  console.log("   • prof.mat@ifpi.edu.br (TEACHER)\n");
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
