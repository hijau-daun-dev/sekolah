export type Gender = "L" | "P";

export interface School {
  id?: string;
  name: string;
  address?: string | null;
  logoUrl?: string | null;
  principalName?: string | null;
  principalNip?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  nip?: string | null;
  name: string;
  gender?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  subject?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  orgLevel: number;
  orgOrder: number;
  parentId?: string | null;
  children?: Teacher[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id?: string;
  nis?: string | null;
  nisn?: string | null;
  name: string;
  gender?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  className?: string | null;
  major?: string | null;
  photoUrl?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianJob?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
