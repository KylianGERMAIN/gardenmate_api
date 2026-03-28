import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PlantEntity } from "./entities/plant.entity";
import { PlantsService } from "./plants.service";
import { PlantsController } from "./plants.controller";

@Module({
  imports: [TypeOrmModule.forFeature([PlantEntity])],
  controllers: [PlantsController],
  providers: [PlantsService],
  exports: [PlantsService],
})
export class PlantsModule {}
