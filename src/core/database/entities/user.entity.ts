import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Index,
} from 'typeorm';
import { UserRole } from '../../../shared/constants/roles';
import { USER_TABLE_NAME } from '../../../core/config/user-table.config';
import { BaseUser } from './base-user.entity';

@Entity(USER_TABLE_NAME)
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['lastLoginAt'])
@Index(['lockedUntil'])
export class User extends BaseUser {


    @Column({ type: 'varchar', length: 100, nullable: true })
    username?: string | null;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
        enumName: 'user_role',
        comment: 'Rol del usuario: admin, user, doctor',
    })
    role!: UserRole;

    @Column({ default: false })
    isVerified!: boolean;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    verificationCode?: string | null;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    avatarUrl?: string | null;

    // Autenticación y seguridad
    @Column({
        type: 'datetime',
        nullable: true,
        name: 'last_login_at',
    })
    lastLoginAt?: Date | null;

    @Column({
        default: 0,
        name: 'login_attempts',
    })
    loginAttempts!: number;

    @Column({
        type: 'datetime',
        nullable: true,
        name: 'locked_until',
    })
    lockedUntil?: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    resetPasswordToken?: string | null;

    @Column({ type: 'datetime', nullable: true })
    resetPasswordExpires?: Date | null;
}