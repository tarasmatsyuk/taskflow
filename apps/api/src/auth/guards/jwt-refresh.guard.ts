import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Validates the refresh token (Authorization: Bearer <refreshToken>). */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
