import { Controller, HttpCode, HttpStatus, Post, UseGuards, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { RemindersJob } from "./reminders.job";
import { Public } from "@/common/decorators/public.decorator";
import { InternalSecretGuard } from "@/common/guards/internal-secret.guard";

/**
 * Endpoint interne déclenché par un scheduler externe (cron GitHub Actions).
 * Public vis-à-vis du JWT, mais protégé par le secret partagé `x-internal-secret`.
 */
@Public()
@UseGuards(InternalSecretGuard)
@ApiExcludeController()
@Controller({ path: "internal", version: VERSION_NEUTRAL })
export class InternalRemindersController {
  constructor(private readonly remindersJob: RemindersJob) {}

  @Post("run-reminders")
  @HttpCode(HttpStatus.OK)
  runReminders(): Promise<{ users: number; reminders: number }> {
    return this.remindersJob.run(new Date());
  }
}
