import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtRefreshPayload, RefreshUser } from '../types/jwt-payload';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  // Hand the raw refresh token to the service so it can compare against the hash.
  validate(req: Request, payload: JwtRefreshPayload): RefreshUser {
    const refreshToken = (req.headers.authorization ?? '')
      .replace(/^Bearer\s+/i, '')
      .trim();
    return { sub: payload.sub, refreshToken };
  }
}
