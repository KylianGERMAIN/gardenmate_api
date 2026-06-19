import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthService, type ReadinessResult } from "./health.service";
import { Public } from "@/common/decorators/public.decorator";

@Public()
@ApiTags("health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: "Liveness probe — the process is up" })
  @ApiResponse({ status: 200, description: "Alive" })
  @Get()
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @ApiOperation({ summary: "Readiness probe — dependencies (database) are reachable" })
  @ApiResponse({ status: 200, description: "Ready" })
  @ApiResponse({ status: 503, description: "Not ready (a dependency is down)" })
  @Get("ready")
  readiness(): Promise<ReadinessResult> {
    return this.healthService.checkReadiness();
  }
}
