export interface JwtAccessPayload {
  sub: string;
  email: string;
}

export interface JwtRefreshPayload {
  sub: string;
}
