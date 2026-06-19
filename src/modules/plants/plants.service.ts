import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { PlantEntity } from "./entities/plant.entity";
import { PlantDto } from "./dto/plant.dto";
import { CreatePlantDto } from "./dto/create-plant.dto";
import type { PlantQueryDto } from "./dto/plant-query.dto";
import { paginate, type PaginatedDto } from "@/common/dto/paginated.dto";

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(PlantEntity)
    private readonly plantRepository: Repository<PlantEntity>,
  ) {}

  /**
   * Retourne la liste paginée des plantes, avec filtres optionnels sur le niveau
   * de soleil et le nom. Tri stable par nom (indispensable à une pagination cohérente).
   */
  async findAll(query: PlantQueryDto): Promise<PaginatedDto<PlantDto>> {
    const [plants, total] = await this.plantRepository.findAndCount({
      where: {
        ...(query.sunlightLevel && { sunlightLevel: query.sunlightLevel }),
        ...(query.name && { name: ILike(`%${query.name}%`) }),
      },
      order: { name: "ASC" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return paginate(
      plants.map((p) => plainToInstance(PlantDto, p)),
      total,
      query,
    );
  }

  /**
   * Crée une nouvelle plante dans le catalogue.
   * @throws {ConflictException} si une plante avec ce nom existe déjà
   */
  async create(dto: CreatePlantDto): Promise<PlantDto> {
    const existing = await this.plantRepository.findOne({ where: { name: dto.name } });

    if (existing) throw new ConflictException("A plant with this name already exists");

    const plant = this.plantRepository.create({
      name: dto.name,
      sunlightLevel: dto.sunlightLevel,
      wateringFrequency: dto.wateringFrequency ?? null,
    });

    const saved = await this.plantRepository.save(plant);

    return plainToInstance(PlantDto, saved);
  }

  /**
   * Supprime une plante du catalogue par son ID.
   * @throws {NotFoundException} si la plante n'existe pas
   */
  async remove(id: string): Promise<PlantDto> {
    const plant = await this.plantRepository.findOne({ where: { id } });

    if (!plant) throw new NotFoundException("Plant not found");

    await this.plantRepository.remove(plant);

    return plainToInstance(PlantDto, { ...plant, id });
  }
}
