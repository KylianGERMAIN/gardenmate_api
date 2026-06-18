import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";

/** Simule AuthGuard('jwt') sans Passport ni base de données. */
jest.mock("@nestjs/passport", () => ({
  AuthGuard: () =>
    class {
      canActivate() {
        return true;
      }
    },
}));

const buildContext = (isPublic: boolean): ExecutionContext => {
  const handler = isPublic
    ? Object.assign(() => {}, { [IS_PUBLIC_KEY]: true })
    : () => {};

  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({}),
    }),
  } as unknown as ExecutionContext;
};

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it("laisse passer sans token si la route est @Public()", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

    const result = guard.canActivate(buildContext(true));

    expect(result).toBe(true);
  });

  it("délègue à AuthGuard('jwt') si la route n'est pas @Public()", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    const superSpy = jest.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)),
      "canActivate",
    ).mockReturnValue(true);

    guard.canActivate(buildContext(false));

    expect(superSpy).toHaveBeenCalled();
  });
});
