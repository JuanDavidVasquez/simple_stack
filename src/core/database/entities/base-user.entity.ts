import { Column, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Entidad base para todos los tipos de usuarios
 * Contiene los campos comunes que necesita el sistema de autenticación
 */
export abstract class BaseUser {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    email!: string;

    @Column()
    password!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date | null;

    // ✅ Métodos helpers que estarán disponibles en todas las entidades hijas
    getFullName(): string {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    isDeleted(): boolean {
        return this.deletedAt !== null && this.deletedAt !== undefined;
    }
}