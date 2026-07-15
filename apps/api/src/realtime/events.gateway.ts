import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload';

/** Socket after a successful handshake carries the decoded JWT claims. */
interface AuthedSocket extends Socket {
  data: { user?: JwtPayload };
}

const room = (projectId: string) => `project:${projectId}`;

/**
 * Live-board gateway. Clients connect with the access token in the handshake
 * (`auth: { token }`), then emit `join`/`leave` with `{ projectId }` to
 * subscribe to a project's room. TasksService pushes task.* events into the
 * room after each mutation. CORS is scoped to the web origin.
 */
@WebSocketGateway({
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Verify the handshake token; reject (disconnect) unauthenticated sockets. */
  async handleConnection(client: AuthedSocket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      this.bearerFromHeader(client);
    if (!token) {
      this.logger.debug(`Socket ${client.id} rejected: no token`);
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data.user = payload;
    } catch {
      this.logger.debug(`Socket ${client.id} rejected: bad token`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  /** Join a project room after confirming the user is a member (or admin). */
  @SubscribeMessage('join')
  async onJoin(client: AuthedSocket, payload: { projectId: string }) {
    const projectId = payload?.projectId;
    const user = client.data.user;
    if (!projectId || !user) {
      return { ok: false, error: 'projectId required' };
    }
    if (!(await this.isMember(projectId, user))) {
      return { ok: false, error: 'forbidden' };
    }
    await client.join(room(projectId));
    return { ok: true, room: room(projectId) };
  }

  @SubscribeMessage('leave')
  async onLeave(client: AuthedSocket, payload: { projectId: string }) {
    if (payload?.projectId) {
      await client.leave(room(payload.projectId));
    }
    return { ok: true };
  }

  // --- Emit helpers, called by TasksService after a mutation ---------------

  emitTaskCreated(projectId: string, task: unknown) {
    this.server.to(room(projectId)).emit('task.created', task);
  }

  emitTaskUpdated(projectId: string, task: unknown) {
    this.server.to(room(projectId)).emit('task.updated', task);
  }

  emitTaskMoved(projectId: string, task: unknown) {
    this.server.to(room(projectId)).emit('task.moved', task);
  }

  emitTaskDeleted(projectId: string, taskId: string) {
    this.server.to(room(projectId)).emit('task.deleted', { id: taskId, projectId });
  }

  private async isMember(projectId: string, user: JwtPayload): Promise<boolean> {
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.sub } },
      select: { userId: true },
    });
    return !!membership;
  }

  private bearerFromHeader(client: Socket): string | undefined {
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }
}
