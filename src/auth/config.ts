import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

function dbFingerprint() {
  try {
    const raw = process.env.DATABASE_URL;
    if (!raw) return "db=missing";
    const parsed = new URL(raw);
    const db = parsed.pathname.replace(/^\//, "") || "unknown";
    return `host=${parsed.hostname}:${parsed.port || "5432"} db=${db}`;
  } catch {
    return "db=invalid-url";
  }
}

// Full Prisma implementation: src/app/api/_implementations/
// Activate after: npm install && npx prisma generate && npx prisma migrate dev

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  // Avoid forcing secure cookies during local HTTP development.
  useSecureCookies: process.env.NODE_ENV === "production",
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? "manager";
        token.companyId = (user as any).companyId ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
          const password = credentials?.password as string | undefined;
          if (!email || !password) {
            console.error("[auth][credentials] missing email or password", { hasEmail: Boolean(email), hasPassword: Boolean(password) });
            return null;
          }

          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            include: { company: { select: { status: true } } },
          });

          if (!user) {
            console.error("[auth][credentials] user not found", { email, db: dbFingerprint() });
            return null;
          }

          if (user.company.status !== "active") {
            console.error("[auth][credentials] company inactive", {
              email,
              userId: user.id,
              companyStatus: user.company.status,
              db: dbFingerprint(),
            });
            return null;
          }

          if (!user.passwordHash) {
            console.error("[auth][credentials] user missing password hash", { email, userId: user.id, db: dbFingerprint() });
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          if (!passwordMatch) {
            console.error("[auth][credentials] password mismatch", { email, userId: user.id, db: dbFingerprint() });
            return null;
          }

          prisma.user
            .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
            .catch(() => {});

          console.error("[auth][credentials] login success", {
            email,
            userId: user.id,
            companyId: user.companyId,
            role: user.role,
            db: dbFingerprint(),
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
          } as any;
        } catch (error) {
          console.error("[auth][credentials] authorize exception", {
            db: dbFingerprint(),
            error,
          });
          return null;
        }
      },
    }),
  ],
});
