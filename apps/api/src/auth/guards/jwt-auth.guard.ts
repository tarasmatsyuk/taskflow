import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects a route: requires a valid access token (Authorization: Bearer). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
