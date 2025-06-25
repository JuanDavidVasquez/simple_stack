import { UserRole } from "../constants/roles";

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'email' | 'username';
  sortOrder?: 'ASC' | 'DESC';
  createdFrom?: Date;
  createdTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
  language?: 'en' | 'es';
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isDeleted?: boolean;
  lastLoginAt?: Date;
  language?: 'en' | 'es';
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  language?: 'en' | 'es';
  lastLoginAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  updatedAt?: Date;
}