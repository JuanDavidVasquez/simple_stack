import { PaginatedRequest, PaginatedResponse } from '../../shared/interfaces/pagination.interface';
import { User } from '../../core/database/entities/user.entity';
import { AppDataSource } from '../../core/database/config/database.config';

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
  }
});