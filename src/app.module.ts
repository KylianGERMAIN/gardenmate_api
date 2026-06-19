import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlantsModule } from './modules/plants/plants.module';
import { UserPlantsModule } from './modules/user-plants/user-plants.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Scheduler actif hors test uniquement : en test les jobs sont déclenchés
    // directement (job.run()), et lancer de vrais timers cron à travers les apps
    // de test créées/fermées en série provoque du flaky (socket hang up / 401).
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]),
    // Throttling global : 100 req/min par IP (surchargé plus strictement sur l'auth).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    NotificationsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Throttling en tête (désactivé en test pour ne pas fausser la suite e2e), puis JWT, puis rôles.
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [{ provide: APP_GUARD, useClass: ThrottlerGuard }]),
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule implements NestModule {
  /** Enregistre le middleware `RequestId` sur toutes les routes. */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
