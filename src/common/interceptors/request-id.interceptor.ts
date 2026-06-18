import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Request } from "express";
import { REQUEST_ID_KEY } from "@/common/middleware/request-id.middleware";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  /** Injecte le `requestId` dans le body de chaque réponse succès (objets non-tableaux). */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request[REQUEST_ID_KEY] as string | undefined;

    return next.handle().pipe(
      map((data: unknown) => this.appendRequestId(data, requestId)),
    );
  }

  /** Ajoute le requestId à un objet de réponse. Ignore les tableaux, null et primitifs. */
  private appendRequestId(data: unknown, requestId: string | undefined): unknown {
    if (!requestId || data === null || typeof data !== "object" || Array.isArray(data)) {
      return data;
    }
    return { ...(data as object), requestId };
  }
}
