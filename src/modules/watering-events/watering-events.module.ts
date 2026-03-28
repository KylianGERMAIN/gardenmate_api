import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WateringEventEntity } from "./entities/watering-event.entity";
import { WateringEventsService } from "./watering-events.service";
import { WateringEventsController } from "./watering-events.controller";

@Module({
  imports: [TypeOrmModule.forFeature([WateringEventEntity])],
  controllers: [WateringEventsController],
  providers: [WateringEventsService],
})
export class WateringEventsModule {}
