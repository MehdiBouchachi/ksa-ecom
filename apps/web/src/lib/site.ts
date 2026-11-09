export const siteUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
/** Staging/preview deployments must never be indexed. */
export const indexable = process.env.ALLOW_INDEXING === "true";
