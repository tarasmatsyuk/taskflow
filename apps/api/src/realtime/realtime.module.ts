import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';

/**
 * Realtime module: exposes EventsGateway so TasksService can push task.*
 * events. JwtModule.register({}) mirrors AuthModule — the access secret is
 * passed per-call when verifying the socket handshake token.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class RealtimeModule {}
