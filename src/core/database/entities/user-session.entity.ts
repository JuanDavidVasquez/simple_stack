import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { authTableConfig } from '../../config/auth-dynamic.config';

@Entity('user_sessions')
@Index(['userId', 'isActive'])
@Index(['expiresAt'])
@Index(['deviceId'])
@Index(['apiName']) // ✅ Índice para separar por API
@Index(['apiName', 'userId', 'isActive']) // ✅ Índice compuesto para consultas eficientes
@Index(['sourceTable', 'userId']) // ✅ Índice para la tabla origen
export class UserSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'session_id', unique: true })
    sessionId!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    // ✅ NUEVO: Campo para identificar desde qué API viene la sesión
    @Column({
        type: 'varchar',
        length: 32,
        default: authTableConfig.apiName,
        name: 'api_name',
        comment: 'Identifica desde qué API se creó esta sesión'
    })
    apiName!: string;

    // ✅ NUEVO: Campo para identificar de qué tabla viene el usuario
    @Column({
        type: 'varchar',
        length: 64,
        default: authTableConfig.tableName,
        name: 'source_table',
        comment: 'Tabla de origen del usuario (users, students, instructors, etc.)'
    })
    sourceTable!: string;

    // ✅ NUEVO: Campo opcional para almacenar info del tipo de usuario
    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
        name: 'user_type',
        comment: 'Tipo específico de usuario (student, instructor, admin, etc.)'
    })
    userType?: string | null;

    @Column({ name: 'refresh_token', type: 'varchar', length: 512, unique: true })
    refreshToken!: string;

    @Column({ name: 'device_id', nullable: true })
    deviceId?: string;

    @Column({ name: 'device_name', nullable: true })
    deviceName?: string;

    @Column({ name: 'device_type', nullable: true })
    deviceType?: string; // 'desktop', 'mobile', 'tablet'

    @Column({ name: 'browser', nullable: true })
    browser?: string;

    @Column({ name: 'browser_version', nullable: true })
    browserVersion?: string;

    @Column({ name: 'os', nullable: true })
    os?: string;

    @Column({ name: 'os_version', nullable: true })
    osVersion?: string;

    @Column({ name: 'ip_address', nullable: true })
    ipAddress?: string;

    @Column({ name: 'location', nullable: true })
    location?: string; // Ciudad, País

    @Column({ name: 'is_active', default: true })
    isActive!: boolean;

    @Column({ name: 'last_activity', type: 'datetime', nullable: true })
    lastActivity?: Date;

    @Column({ name: 'expires_at', type: 'datetime' })
    expiresAt!: Date;

    @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
    revokedAt?: Date;

    @Column({ name: 'revoked_reason', nullable: true })
    revokedReason?: string; // 'logout', 'expired', 'suspicious_activity', 'user_request'

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    // ✅ Método helper para verificar si la sesión pertenece a esta API
    belongsToThisApi(): boolean {
        return this.apiName === authTableConfig.apiName;
    }

    // ✅ Método helper para verificar si la sesión está expirada
    isExpired(): boolean {
        return this.expiresAt < new Date();
    }

    // ✅ Método helper para verificar si la sesión está activa y no expirada
    isValidSession(): boolean {
        return this.isActive && !this.isExpired();
    }

    // ✅ Método helper para obtener información resumida del dispositivo
    getDeviceInfo(): string {
        const parts: string[] = [];
        
        if (this.browser) {
            parts.push(this.browser);
        }
        
        if (this.os) {
            parts.push(`on ${this.os}`);
        }
        
        if (this.deviceType && this.deviceType !== 'desktop') {
            parts.push(`(${this.deviceType})`);
        }

        return parts.join(' ') || this.deviceName || 'Unknown Device';
    }

    // ✅ Método helper para obtener el identificador completo del usuario
    getFullUserId(): string {
        return `${this.sourceTable}:${this.userId}`;
    }
}