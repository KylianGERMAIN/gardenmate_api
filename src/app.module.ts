import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PlantsModule } from './modules/plants/plants.module.js';
import { UserPlantsModule } from './modules/user-plants/user-plants.module.js';
import { WateringEventsModule } from './modules/watering-events/watering-events.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow('DB_HOST'),
        port: config.getOrThrow<number>('DB_PORT'),
        username: config.getOrThrow('DB_USER'),
        password: config.getOrThrow('DB_PASSWORD'),
        database: config.getOrThrow('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
    }),
    AuthModule,
    UsersModule,
    PlantsModule,
    UserPlantsModule,
    WateringEventsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Ordre important : JWT d'abord, puis rôles
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
