import { z } from "zod";
import { getCustomer, setCustomerStatus } from "@/server/admin/people";
import { adminRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";
import { ok, readJson } from "@/server/lib/http";

export const GET = adminRoute<{ id: string }>(async (_req, u, { id }) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "غير موجود");
  const c = await getCustomer(u, id);
  if (!c) throw new AppError("NOT_FOUND", "غير موجود");
  return ok(c);
});

export const PATCH = adminRoute<{ id: string }>(async (req, u, { id }) => {
  const { status } = await readJson(req, z.object({ status: z.enum(["ACTIVE", "DISABLED"]) }));
  await setCustomerStatus(u, id, status);
  return ok({ id, status });
});
