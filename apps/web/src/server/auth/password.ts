import bcrypt from "bcryptjs";

/** bcrypt (pure JS => works on Hostinger's managed Node runtime without native builds). */
const COST = Number(process.env.BCRYPT_COST ?? 12);

export const hashPassword = (pw: string) => bcrypt.hash(pw, COST);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// Pre-computed hash used to equalize timing when the account does not exist.
let dummy: string | null = null;
export async function dummyVerify(pw: string) {
  dummy ??= await bcrypt.hash("dummy-password-for-timing", COST);
  await bcrypt.compare(pw, dummy);
  return false;
}
