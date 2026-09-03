import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            role: true,
            sekolah: { select: { id: true, nama: true, logoUrl: true } },
          },
        });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role.name,
          roleId: user.roleId,
          sekolahId: user.sekolahId ? String(user.sekolahId) : null,
          sekolahNama: user.sekolah?.nama ?? null,
          sekolahLogo: user.sekolah?.logoUrl ?? null,
          pegawaiId: user.pegawaiId ? String(user.pegawaiId) : null,
          ortuId: user.ortuId ? String(user.ortuId) : null,
          siswaId: user.siswaId ? String(user.siswaId) : null,
        } as const;
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        const u = user as unknown as {
          id: string;
          role: string;
          roleId: number;
          sekolahId: string | null;
          sekolahNama: string | null;
          sekolahLogo: string | null;
          pegawaiId: string | null;
          ortuId: string | null;
          siswaId: string | null;
        };
        token.id = u.id;
        token.role = u.role;
        token.roleId = u.roleId;
        token.sekolahId = u.sekolahId;
        token.sekolahNama = u.sekolahNama;
        token.sekolahLogo = u.sekolahLogo;
        token.pegawaiId = u.pegawaiId;
        token.ortuId = u.ortuId;
        token.siswaId = u.siswaId;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).roleId = token.roleId;
        (session.user as Record<string, unknown>).sekolahId = token.sekolahId;
        (session.user as Record<string, unknown>).sekolahNama = token.sekolahNama;
        (session.user as Record<string, unknown>).sekolahLogo = token.sekolahLogo;
        (session.user as Record<string, unknown>).pegawaiId = token.pegawaiId;
        (session.user as Record<string, unknown>).ortuId = token.ortuId;
        (session.user as Record<string, unknown>).siswaId = token.siswaId;
      }
      return session;
    },
  },
});
