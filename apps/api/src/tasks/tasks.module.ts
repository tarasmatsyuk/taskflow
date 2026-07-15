import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

// RealtimeModule → EventsGateway (task.* emits); MailModule → `emails` queue
// (assignment notifications). CacheModule is global (registered in AppModule).
@Module({
  imports: [RealtimeModule, MailModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
