import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Full Prisma implementation: src/app/api/_implementations/
// Activate after: npm install && npx prisma generate && npx prisma migrate dev

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
        // SCAFFOLD: Replace with real Prisma lookup from _implementations/auth.ts
        // For demo: accepts any email with password "Demo1234!"
        if (credentials?.password === "Demo1234!" && credentials?.email) {
          return {
            id: "demo-user",
            email: credentials.email as string,
            name: "Demo User",
            role: "admin",
            companyId: "demo-company",
          } as any;
        }
        return null;
      },
    }),
  ],
});
