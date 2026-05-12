"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { filterPeople, personImage, type PersonSearchItem } from "@/lib/people";

type UserItem = PersonSearchItem & {
  id: string;
};

const participantRoles = [
  ["PRESIDENT", "Presidente"],
  ["SECRETARY", "Secretário"],
  ["TEACHER", "Docente"],
  ["PEDAGOGICAL", "Pedagógico"],
  ["COORDINATOR", "Coordenação"],
  ["STUDENT_REPRESENTATIVE", "Representante discente"],
  ["GUEST", "Convidado"]
];

export function ParticipantSearch({
  meetingId,
  users,
  existingUserIds,
  action
}: {
  meetingId: string;
  users: UserItem[];
  existingUserIds: string[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [roleByUser, setRoleByUser] = useState<Record<string, string>>({});
  const existing = new Set(existingUserIds);
  const filteredUsers = useMemo(() => filterPeople(users, query), [users, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full pl-9"
          placeholder="Buscar por nome, e-mail, perfil ou cargo"
          aria-label="Buscar pessoa para o conselho"
        />
      </div>

      <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
        {filteredUsers.map((user) => {
          const selectedRole = roleByUser[user.id] || defaultParticipantRole(user.role);
          const alreadyAdded = existing.has(user.id);

          return (
            <form key={user.id} action={action} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <input type="hidden" name="meetingId" value={meetingId} />
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-3 sm:grid-cols-[56px_1fr] sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={personImage(user.imageUrl)}
                  alt={`Foto de ${user.name}`}
                  className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.title || user.role}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <select
                  name="role"
                  value={selectedRole}
                  onChange={(event) => setRoleByUser((current) => ({ ...current, [user.id]: event.target.value }))}
                >
                  {participantRoles.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-md bg-ifpi-green px-3 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={alreadyAdded}
                >
                  {alreadyAdded ? "Adicionado" : "Adicionar"}
                </button>
              </div>
            </form>
          );
        })}
        {!filteredUsers.length ? (
          <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Nenhuma pessoa encontrada.</div>
        ) : null}
      </div>
    </div>
  );
}

function defaultParticipantRole(userRole: string) {
  const map: Record<string, string> = {
    DIRECAO: "PRESIDENT",
    SECRETARIO: "SECRETARY",
    DOCENTE: "TEACHER",
    PEDAGOGICO: "PEDAGOGICAL",
    COORDENACAO: "COORDINATOR",
    DISCENTE: "STUDENT_REPRESENTATIVE"
  };

  return map[userRole] || "GUEST";
}
