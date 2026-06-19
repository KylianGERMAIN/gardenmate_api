import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPlantEntity } from "./entities/user-plant.entity";
import { UserPlantsService } from "./user-plants.service";
import { UserPlantsController } from "./user-plants.controller";
import { CareEngineService } from "./care/care-engine.service";
import { WeatherService } from "./weather/weather.service";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([UserPlantEntity]), UsersModule],
  controllers: [UserPlantsController],
  providers: [UserPlantsService, CareEngineService, WeatherService],
  exports: [UserPlantsService],
})
export class UserPlantsModule {}
