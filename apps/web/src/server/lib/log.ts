/** Minimal structured logger. Redacts obvious PII/secrets; never log passwords, tokens or card data. */
const REDACT = /(password|token|secret|authorization|cookie|card|cvv|pan|email|phone)/i;

function redact(v: unknown, depth = 0): unknown {
  if (depth > 4 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) out[k] = REDACT.test(k) ? "[redacted]" : redact(val, depth + 1);
  return out;
}

function emit(level: "info" | "warn" | "error", msg: string, data?: Record<string, unknown>) {
  if (process.env.LOG_SILENT === "1") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(data ? (redact(data) as object) : {}) });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  info: (m: string, d?: Record<string, unknown>) => emit("info", m, d),
  warn: (m: string, d?: Record<string, unknown>) => emit("warn", m, d),
  error: (m: string, d?: Record<string, unknown>) => emit("error", m, d),
};
