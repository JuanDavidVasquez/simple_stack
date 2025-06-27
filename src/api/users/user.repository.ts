import { PaginatedRequest, PaginatedResponse } from '../../shared/interfaces/pagination.interface';
import { AppDataSource } from '../../core/database/config/database.config';
import { User } from '../../core/database/entities/entities/user.entity';

export const UserRepository = AppDataSource.getRepository(User).extend({
  async getAllUsers(params: PaginatedRequest): Promise<PaginatedResponse<User>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      filters = {},
    } = params;

    const offset = (page - 1) * limit;

    // Construimos el query
    const queryBuilder = this.createQueryBuilder('user');

    // Aplicar filtros dinámicos
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: value });
      }
    });

    // Ordenar
    queryBuilder.orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Paginación
    queryBuilder.skip(offset).take(limit);

    console.log('Generated SQL:', queryBuilder.getSql());
    console.log('Query parameters:', queryBuilder.getParameters());

    // Ejecutar query y contar total
    const [data, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

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
  },

  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.create(userData);
    console.log('Creating user with data:', userData);
    return await this.save(user);
  },

  async getUserById(id: string): Promise<User | null> {
    const user = await this.findOne({ where: { id } });
    if (!user) {
      console.warn(`User with ID ${id} not found`);
      return null;
    }
    return user;
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const user = await this.findOne({ where: { id } });
    if (!user) {
      console.warn(`User with ID ${id} not found for update`);
      return null;
    }
    Object.assign(user, userData);
    return await this.save(user);
  },

  async deleteUser(id: string): Promise<void> {
    const user = await this.findOne({ where: { id } });
    if (!user) {
      console.warn(`User with ID ${id} not found for deletion`);
      return;
    }
    await this.remove(user);
  },
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.findOne({ where: { email } });
    if (!user) {
      console.warn(`User with email ${email} not found`);
      return null;
    }
    return user;
  },
  async softDeleteUser(id: string): Promise<User | null> {
    const user = await this.findOne({ where: { id } });
    if (!user) {
      console.warn(`User with ID ${id} not found for soft deletion`);
      return null;
    }
    await this.softRemove(user);
    return user;
  },
  async getUsersCount(): Promise<number> {
    return await this.count({ withDeleted: true });
  },

});