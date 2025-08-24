import { Service } from "typedi";
import { AppDataSource } from "../../core/database/config/database.config";
import { Pet } from "../../core/database/entities/entities/pet.entity";
import { Repository } from "typeorm/repository/Repository.js";
import { PaginatedRequest, PaginatedResponse } from "../../shared/interfaces/pagination.interface";

@Service()
export class PetRepository extends Repository<Pet> {
  constructor() {
    super(Pet, AppDataSource.manager);
  }

  async getAllPets(params: PaginatedRequest = {}): Promise<PaginatedResponse<Pet>> {
    const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {}
    } = params;

    const offset = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder('pet').select([
      'pet.id',
      'pet.name',
      'pet.type',
      'pet.age',
    ]);

    // Filtros dinámicos con parámetros únicos
    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        const paramName = `${key}_${index}`;
        queryBuilder.andWhere(`pet.${key} = :${paramName}`, { [paramName]: value });
      }
    });

    queryBuilder.orderBy(`pet.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    queryBuilder.skip(offset).take(limit);

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
  }
  async createPets(petData: Partial<Pet>): Promise<Pet> {
    const pet = this.create(petData);
    await this.save(pet);
    return pet;
  }
  async updatePet(id: number, petData: Partial<Pet>): Promise<Pet> {
    const petToUpdate = await this.preload({ id: String(id), ...petData });
    
    if (!petToUpdate) {
      throw new Error(`Pet with id ${id} not found`);
    }

    return await this.save(petToUpdate);
  }
  async getPetById(id: string): Promise<Pet | null> {
    return await this.findOne({ where: { id } });
  }
  async deletePet(id: string): Promise<void> {
    const petToDelete = await this.findOne({ where: { id } });
    if (!petToDelete) {
      throw new Error(`Pet with id ${id} not found`);
    }
    await this.remove(petToDelete);
  }
  async deleteSoftPet(id: string): Promise<void> {
    const petToSoftDelete = await this.findOne({ where: { id } });
    if (!petToSoftDelete) {
      throw new Error(`Pet with id ${id} not found`);
    }
    petToSoftDelete.deletedAt = new Date();
    await this.save(petToSoftDelete);
  }
}