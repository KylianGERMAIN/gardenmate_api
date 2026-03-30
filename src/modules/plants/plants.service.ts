import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { PlantEntity } from "./entities/plant.entity";
import { PlantDto } from "./dto/plant.dto";
import { CreatePlantDto } from "./dto/create-plant.dto";
import type { PlantQueryDto } from "./dto/plant-query.dto";

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(PlantEntity)
    private readonly plantRepository: Repository<PlantEntity>,
  ) {}

  /**
   * Retourne la liste des plantes avec filtres optionnels sur le niveau de soleil et le nom.
   */
  async findAll(query: PlantQueryDto): Promise<PlantDto[]> {
    const plants = await this.plantRepository.find({
      where: {
        ...(query.sunlightLevel && { sunlightLevel: query.sunlightLevel }),
        ...(query.name && { name: ILike(`%${query.name}%`) }),
      },
    });

    return plants.map((p) => plainToInstance(PlantDto, p));
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
