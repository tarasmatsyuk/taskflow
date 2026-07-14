# NestJS — шпаргалка для інтерв'ю

## Що таке NestJS

Node.js-фреймворк для серверних застосунків: TypeScript-first, архітектура натхненна Angular (модулі, DI, декоратори). Під капотом — Express (default) або Fastify. Дає структуру, якої бракує "голому" Express.

## Ключові будівельні блоки

```
Module → Controller → Service (Provider) → Repository/ORM
```

### Module
```ts
@Module({
  imports: [PrismaModule],          // інші модулі
  controllers: [TasksController],
  providers: [TasksService],        // що створює DI-контейнер
  exports: [TasksService],          // що видно іншим модулям
})
export class TasksModule {}
```
- Кожен застосунок має кореневий `AppModule`. Модулі — **singleton** за замовчуванням.
- `@Global()` — модуль видно всюди без імпорту (використовувати рідко: config, logger).
- Динамічні модулі: `forRoot()/forRootAsync()` — модуль з конфігурацією (як `ConfigModule.forRoot()`).

### Controller — тільки HTTP-шар
```ts
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTaskDto, @Req() req: Request) {
    return this.tasksService.create(dto);
  }
}
```
Декоратори параметрів: `@Param`, `@Query`, `@Body`, `@Headers`, `@Req`, `@Res` (з `@Res` відповідаєш вручну — вимикає стандартний механізм).

### Provider / Service — бізнес-логіка
```ts
@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}
}
```

## Dependency Injection — центральна тема

- Nest має **IoC-контейнер**: ти оголошуєш залежності в конструкторі, контейнер створює і підставляє інстанси.
- Резолв за **типом** з конструктора (метадані TypeScript, `emitDecoratorMetadata`).
- Кастомні токени: `{ provide: 'CACHE', useValue/useClass/useFactory }` + `@Inject('CACHE')`.
- **Scope**: `DEFAULT` (singleton), `REQUEST` (новий на запит — дорожче), `TRANSIENT` (новий на кожну ін'єкцію).
- Циклічні залежності: `forwardRef(() => OtherModule)` — а краще перепроєктувати.

## Request lifecycle (порядок — питають часто!)

```
Middleware → Guards → Interceptors (до) → Pipes → Handler → Interceptors (після) → Exception Filters
```

### Middleware
- Як в Express: `(req, res, next)`. До роутингу. Логування, CORS, body parsing.

### Guards — авторизація (можна/не можна)
```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    return validateToken(req.headers.authorization);
  }
}
// @UseGuards(JwtAuthGuard) — на метод/контролер; app.useGlobalGuards() — глобально
```
- Доступ до handler-метаданих через `Reflector` (для `@Roles('admin')`).

### Interceptors — навколо виклику (RxJS)
```ts
intercept(ctx: ExecutionContext, next: CallHandler) {
  const start = Date.now();
  return next.handle().pipe(tap(() => console.log(`${Date.now() - start}ms`)));
}
```
- Логування, трансформація відповіді, кешування, таймаути, мапінг помилок.

### Pipes — валідація і трансформація вхідних даних
```ts
// main.ts — глобальна валідація
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // викидає зайві поля
  forbidNonWhitelisted: true,  // або кидає помилку на зайві
  transform: true,             // приводить до типів DTO
}));
```
```ts
// DTO + class-validator
export class CreateTaskDto {
  @IsString() @MinLength(1)
  title: string;

  @IsOptional() @IsEnum(Priority)
  priority?: Priority;
}
```
- Вбудовані: `ParseIntPipe`, `ParseUUIDPipe`, `DefaultValuePipe`.

### Exception Filters — обробка помилок
```ts
throw new NotFoundException('Task not found'); // вбудовані HttpException-класи
```
```ts
@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception, host: ArgumentsHost) { /* мапінг P2002 → 409 тощо */ }
}
```

## Аутентифікація (типовий стек)

- **Passport** + `@nestjs/passport`: стратегії `passport-local` (логін/пароль), `passport-jwt` (Bearer-токен).
- `@nestjs/jwt` — підпис/верифікація токенів.
- Патерн: access token (короткий, 15хв) + refresh token (довгий, з ротацією); паролі — argon2/bcrypt.
- Кастомний декоратор для юзера:
```ts
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
```
- Публічні маршрути при глобальному guard: `@Public()` (SetMetadata) + перевірка через Reflector.

## Конфігурація

```ts
ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }); // .env + валідація схеми
constructor(private config: ConfigService) { this.config.get('DATABASE_URL'); }
```

## Робота з БД

- ORM на вибір: **Prisma** (PrismaService extends PrismaClient + onModuleInit connect), **TypeORM** (`@nestjs/typeorm`, entities + repositories), Drizzle, MikroORM.
- Репозиторій-патерн: сервіс не знає про деталі ORM (легше тестувати/міняти).

## Інше, про що питають

- **Lifecycle hooks**: `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `enableShutdownHooks()` — graceful shutdown.
- **Microservices**: `@nestjs/microservices` — транспорти TCP/Redis/Kafka/RabbitMQ/gRPC; `@MessagePattern()` (request-response), `@EventPattern()` (події).
- **WebSockets**: `@WebSocketGateway()`, `@SubscribeMessage()` (socket.io/ws).
- **Task scheduling**: `@nestjs/schedule` — `@Cron('0 * * * *')`.
- **Queues**: `@nestjs/bullmq` — фонові задачі.
- **Swagger**: `@nestjs/swagger` — `@ApiProperty()`, автогенерація OpenAPI з DTO.
- **CQRS**: `@nestjs/cqrs` — команди/запити/події для складних доменів.

## Тестування

```ts
const module = await Test.createTestingModule({
  providers: [TasksService, { provide: PrismaService, useValue: mockPrisma }],
}).compile();
const service = module.get(TasksService);
```
- Unit: мокаєш залежності через DI (головна перевага архітектури Nest).
- E2E: `supertest` проти `app.getHttpServer()`.

## Часті питання на інтерв'ю

1. **Порядок виконання pipeline?** Middleware → Guards → Interceptors → Pipes → Handler → Interceptors → Filters.
2. **Guard vs Middleware?** Guard знає контекст виконання (який handler, метадані через Reflector) і вирішує "пускати чи ні"; middleware — нижчерівневий, до роутингу.
3. **Guard vs Interceptor?** Guard — до handler'а, тільки allow/deny. Interceptor — обгортає виклик, може змінити і запит, і відповідь.
4. **Навіщо DTO + ValidationPipe?** Типобезпека + рантайм-валідація на межі системи; whitelist захищає від mass assignment.
5. **Як працює DI у Nest?** IoC-контейнер, резолв за типами з конструктора, провайдери реєструються в модулях, singleton за замовчуванням.
6. **Що таке ExecutionContext?** Абстракція над транспортом (HTTP/WS/RPC): `switchToHttp().getRequest()`, `getHandler()` для метаданих.
7. **Express vs Fastify під капотом?** Адаптери; Fastify швидший, але частина middleware-екосистеми — Express-only.
8. **Чому Nest, а не Express?** Структура, DI (тестованість), модульність, з коробки валідація/guards/swagger — менше "велосипедів" у команді.
