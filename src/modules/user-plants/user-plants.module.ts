import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPlantEntity } from "./entities/user-plant.entity";
import { UserPlantsService } from "./user-plants.service";
import { UserPlantsController } from "./user-plants.controller";

@Module({
  imports: [TypeOrmModule.forFeature([UserPlantEntity])],
  controllers: [UserPlantsController],
  providers: [UserPlantsService],
  exports: [UserPlantsService],
})
export class UserPlantsModule {}
