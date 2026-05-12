export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export function ok(message?: string): ActionResult {
  return { ok: true, message };
}

export function fail(message: string): ActionResult {
  return { ok: false, message };
}
