import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { PaginatedRequest, PaginatedResponse } from '../../shared/interfaces/pagination.interface';
import { AppDataSource } from '../../core/database/config/database.config';

// Importar todas las entidades disponibles
import { User } from '../../core/database/entities/entities/user.entity';
import { Veterinarian } from '../../core/database/entities';


const nameTableDynamic = process.env.AUTH_TABLE_NAME || 'users';

// Mapeo de nombres de tabla a entidades
const ENTITY_MAP: Record<string, any> = {
  'users': User,
  'veterinarians': Veterinarian,
};

@Service()
export class UserRepository extends Repository<any> {
  private tableName: string;
  private entityClass: any;

  constructor() {
    // Obtener la entidad correspondiente
    const EntityClass = ENTITY_MAP[nameTableDynamic];
    
    if (!EntityClass) {
      throw new Error(`Entity not found for table: ${nameTableDynamic}. Available tables: ${Object.keys(ENTITY_MAP).join(', ')}`);
    }

    // Inicializar el repository con la entidad correcta
    super(EntityClass, AppDataSource.manager);
    
    this.tableName = nameTableDynamic;
    this.entityClass = EntityClass;
    
    console.log(`🗄️ UserRepository configured for table: '${nameTableDynamic}' using entity: ${EntityClass.name}`);
  }

  async getAllUsers(params: PaginatedRequest): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      filters = {},
    } = params;

    const offset = (page - 1) * limit;

    // Crear query builder especificando la tabla
    const queryBuilder = this.createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.isActive',
        'user.isVerified',
        'user.avatarUrl',
        'user.lastLoginAt',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Filtros dinámicos
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: value });
      }
    });

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    console.log(`📊 Fetched ${data.length} records from table '${this.tableName}'`);

    return {
      data,
      total,
      page,
      limit,
      offset,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async createUser(userData: Partial<any>): Promise<any> {
    try {
      const user = this.create(userData);
      console.log(`Creating user in table '${this.tableName}' with data:`, {
        ...userData,
        password: userData.password ? '[HIDDEN]' : undefined
      });
      
      const savedUser = await this.save(user);
      console.log(`✅ User created successfully in table '${this.tableName}' with ID: ${savedUser.id}`);
      
      return savedUser;
    } catch (error) {
      console.error(`❌ Error creating user in table '${this.tableName}':`, error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<any | null> {
    try {
      const user = await this.findOne({ 
        where: { id },
        select: [
          'id', 'email', 'username', 'firstName', 'lastName', 
          'role', 'isActive', 'isVerified', 'avatarUrl', 
          'lastLoginAt', 'createdAt', 'updatedAt'
        ]
      });
      
      if (!user) {
        console.warn(`User with ID ${id} not found in table '${this.tableName}'`);
        return null;
      }
      
      console.log(`📋 User retrieved from table '${this.tableName}': ${user.email}`);
      return user;
    } catch (error) {
      console.error(`❌ Error fetching user by ID from table '${this.tableName}':`, error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<any>): Promise<any | null> {
    try {
      const user = await this.findOne({ where: { id } });
      
      if (!user) {
        console.warn(`User with ID ${id} not found for update in table '${this.tableName}'`);
        return null;
      }

      // Actualizar campos
      Object.assign(user, userData);
      user.updatedAt = new Date();
      
      const updatedUser = await this.save(user);
      console.log(`✅ User updated successfully in table '${this.tableName}': ${updatedUser.email}`);
      
      return updatedUser;
    } catch (error) {
      console.error(`❌ Error updating user in table '${this.tableName}':`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.findOne({ where: { id } });
      
      if (!user) {
        console.warn(`User with ID ${id} not found for deletion in table '${this.tableName}'`);
        return;
      }

      await this.remove(user);
      console.log(`🗑️ User deleted successfully from table '${this.tableName}': ${user.email}`);
    } catch (error) {
      console.error(`❌ Error deleting user from table '${this.tableName}':`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<any | null> {
    try {
      const user = await this.findOne({ 
        where: { email },
        select: [
          'id', 'email', 'password', 'username', 'firstName', 'lastName', 
          'role', 'isActive', 'isVerified', 'avatarUrl', 
          'lastLoginAt', 'createdAt', 'updatedAt', 'loginAttempts', 'lockedUntil'
        ]
      });
      
      if (!user) {
        console.warn(`User with email ${email} not found in table '${this.tableName}'`);
        return null;
      }
      
      console.log(`📧 User found by email in table '${this.tableName}': ${user.email}`);
      return user;
    } catch (error) {
      console.error(`❌ Error finding user by email in table '${this.tableName}':`, error);
      throw error;
    }
  }

  async findByUsername(username: string): Promise<any | null> {
    try {
      const user = await this.findOne({ 
        where: { username },
        select: [
          'id', 'email', 'username', 'firstName', 'lastName', 
          'role', 'isActive', 'isVerified', 'avatarUrl', 
          'lastLoginAt', 'createdAt', 'updatedAt'
        ]
      });
      
      if (!user) {
        console.warn(`User with username ${username} not found in table '${this.tableName}'`);
        return null;
      }
      
      console.log(`👤 User found by username in table '${this.tableName}': ${user.username}`);
      return user;
    } catch (error) {
      console.error(`❌ Error finding user by username in table '${this.tableName}':`, error);
      throw error;
    }
  }

  async softDeleteUser(id: string): Promise<any | null> {
    try {
      const user = await this.findOne({ where: { id } });
      
      if (!user) {
        console.warn(`User with ID ${id} not found for soft deletion in table '${this.tableName}'`);
        return null;
      }

      await this.softRemove(user);
      console.log(`🗂️ User soft deleted from table '${this.tableName}': ${user.email}`);
      
      return user;
    } catch (error) {
      console.error(`❌ Error soft deleting user from table '${this.tableName}':`, error);
      throw error;
    }
  }

  async getUsersCount(): Promise<number> {
    try {
      const count = await this.count({ withDeleted: true });
      console.log(`📊 Total users in table '${this.tableName}': ${count}`);
      return count;
    } catch (error) {
      console.error(`❌ Error counting users in table '${this.tableName}':`, error);
      throw error;
    }
  }

  async getActiveUsersCount(): Promise<number> {
    try {
      const count = await this.count({ where: { isActive: true } });
      console.log(`📊 Active users in table '${this.tableName}': ${count}`);
      return count;
    } catch (error) {
      console.error(`❌ Error counting active users in table '${this.tableName}':`, error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<any[]> {
    try {
      const users = await this.find({ 
        where: { role, isActive: true },
        select: [
          'id', 'email', 'username', 'firstName', 'lastName', 
          'role', 'isActive', 'isVerified', 'createdAt'
        ]
      });
      
      console.log(`👥 Found ${users.length} users with role '${role}' in table '${this.tableName}'`);
      return users;
    } catch (error) {
      console.error(`❌ Error fetching users by role from table '${this.tableName}':`, error);
      throw error;
    }
  }

  // Métodos helper
  getTableName(): string {
    return this.tableName;
  }

  getEntityClass(): any {
    return this.entityClass;
  }

  // Método para verificar si un email ya existe
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await this.count({ where: { email } });
      return count > 0;
    } catch (error) {
      console.error(`❌ Error checking email existence in table '${this.tableName}':`, error);
      throw error;
    }
  }

  // Método para verificar si un username ya existe
  async usernameExists(username: string): Promise<boolean> {
    try {
      const count = await this.count({ where: { username } });
      return count > 0;
    } catch (error) {
      console.error(`❌ Error checking username existence in table '${this.tableName}':`, error);
      throw error;
    }
  }

  // Método para incrementar intentos de login
  async incrementLoginAttempts(id: string): Promise<void> {
    try {
      await this.createQueryBuilder()
        .update()
        .set({ 
          loginAttempts: () => 'loginAttempts + 1',
          updatedAt: new Date()
        })
        .where('id = :id', { id })
        .execute();
        
      console.log(`🔒 Login attempts incremented for user ID: ${id} in table '${this.tableName}'`);
    } catch (error) {
      console.error(`❌ Error incrementing login attempts in table '${this.tableName}':`, error);
      throw error;
    }
  }

  // Método para resetear intentos de login
  async resetLoginAttempts(id: string): Promise<void> {
    try {
      await this.createQueryBuilder()
        .update()
        .set({ 
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where('id = :id', { id })
        .execute();
        
      console.log(`🔓 Login attempts reset for user ID: ${id} in table '${this.tableName}'`);
    } catch (error) {
      console.error(`❌ Error resetting login attempts in table '${this.tableName}':`, error);
      throw error;
    }
  }
}