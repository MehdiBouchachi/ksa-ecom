import "server-only";
import { auth } from "@/auth";

/** Thin wrapper so tests can mock session resolution. */
export async function getSessionIdentity(): Promise<{ id: string; sv: number } | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  return { id: s.user.id, sv: s.user.sv };
}
