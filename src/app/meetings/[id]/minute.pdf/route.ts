import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { textToPdfBuffer } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await requireUser();
  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: params.id },
    include: { minute: true }
  });

  if (!meeting.minute) {
    return new NextResponse("Ata não gerada.", { status: 404 });
  }

  const pdf = textToPdfBuffer(meeting.title, meeting.minute.publicContent);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ata-${meeting.id}.pdf"`
    }
  });
}
