import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@saudi-ecom/contracts";
import { verifyCredentials } from "@/server/auth/accounts";
import { clientIp } from "@/server/lib/rate-limit";
import { isAppError } from "@/server/lib/errors";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "CUSTOMER" | "MANAGER" | "ADMIN"; sv: number } & DefaultSession["user"];
  }
  interface User {
    role?: "CUSTOMER" | "MANAGER" | "ADMIN";
    sessionVersion?: number;
  }
}

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Auth.js (v5) Credentials with JWT sessions in HttpOnly, Secure (in production), SameSite=Lax cookies.
 * The JWT carries only the user id + session version; role/status are RE-CHECKED in PostgreSQL by
 * server guards on every protected request (src/server/auth/guards.ts). Never trust the JWT role.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/auth/login" },
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw, request) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        try {
          const u = await verifyCredentials(parsed.data.email, parsed.data.password, clientIp(request.headers));
          return u ? { id: u.id, email: u.email, name: u.fullName, role: u.role, sessionVersion: u.sessionVersion } : null;
        } catch (e) {
          if (isAppError(e) && e.code === "RATE_LIMITED") throw new RateLimited();
          throw e;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.sv = user.sessionVersion ?? 1;
        token.role = user.role ?? "CUSTOMER"; // UI hint only
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.sv = Number(token.sv ?? 0);
      session.user.role = (token.role as "CUSTOMER" | "MANAGER" | "ADMIN") ?? "CUSTOMER";
      return session;
    },
  },
});
