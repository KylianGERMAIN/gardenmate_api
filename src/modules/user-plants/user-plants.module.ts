import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPlantEntity } from "./entities/user-plant.entity";
import { UserPlantsService } from "./user-plants.service";
import { UserPlantsController } from "./user-plants.controller";
import { CareEngineService } from "./care/care-engine.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserPlantEntity])],
  controllers: [UserPlantsController],
  providers: [UserPlantsService, CareEngineService],
  exports: [UserPlantsService],
})
export class UserPlantsModule {}
