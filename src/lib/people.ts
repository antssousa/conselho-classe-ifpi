export const DEFAULT_PERSON_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#e2e8f0"/>
      <circle cx="48" cy="36" r="16" fill="#64748b"/>
      <path d="M20 84c5-18 17-28 28-28s23 10 28 28" fill="#64748b"/>
    </svg>`
  );

export type PersonSearchItem = {
  name: string;
  email: string;
  role: string;
  title?: string | null;
  imageUrl?: string | null;
};

export function personImage(imageUrl?: string | null) {
  return imageUrl?.trim() || DEFAULT_PERSON_IMAGE;
}

export function studentImage(photoUrl?: string | null) {
  return personImage(photoUrl);
}

export function filterPeople<T extends PersonSearchItem>(people: T[], query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return people;
  }

  return people.filter((person) =>
    [person.name, person.email, person.role, person.title || ""].some((value) => normalize(value).includes(normalizedQuery))
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
