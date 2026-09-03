import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      roleId: number;
      sekolahId: string | null;
      sekolahNama: string | null;
      sekolahLogo: string | null;
      pegawaiId: string | null;
      ortuId: string | null;
      siswaId: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    roleId: number;
    sekolahId: string | null;
    sekolahNama: string | null;
    sekolahLogo: string | null;
    pegawaiId: string | null;
    ortuId: string | null;
    siswaId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    roleId: number;
    sekolahId: string | null;
    sekolahNama: string | null;
    sekolahLogo: string | null;
    pegawaiId: string | null;
    ortuId: string | null;
    siswaId: string | null;
  }
}
