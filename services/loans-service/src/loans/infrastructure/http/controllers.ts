import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, AuthUser, CurrentUser, Roles } from '../../../shared/auth';
import { CheckoutUseCase, RenewUseCase, ReturnUseCase } from '../../application/circulation.use-cases';
import { LoanQueries, PenaltyCommands, RemindersJob } from '../../application/loan.queries';
import { BotRenewDto, CheckoutDto, ListLoansQuery, MyLoansQuery, PenaltiesQuery, RemindersDto, ReturnDto, WaiveDto } from './dto';

@ApiTags('loans')
@Controller('loans')
export class LoansController {
  constructor(
    private readonly checkout: CheckoutUseCase,
    private readonly returns: ReturnUseCase,
    private readonly renew: RenewUseCase,
    private readonly queries: LoanQueries,
    private readonly reminders: RemindersJob,
  ) {}

  @Post('checkout')
  @Authenticated()
  @ApiOperation({ summary: 'Préstamo de un ejemplar (autopréstamo o a una matrícula si eres personal)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.checkout.execute({ actor: user, copyRef: dto.copyRef, studentId: dto.studentId });
  }

  @Post('return')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Registra la devolución de un ejemplar escaneado' })
  giveBack(@Body() dto: ReturnDto) {
    return this.returns.byCopyRef(dto.copyRef, 'DESK');
  }

  @Post(':id/return')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  giveBackById(@Param('id', ParseUUIDPipe) id: string) {
    return this.returns.byLoanId(id, 'APP');
  }

  @Post(':id/renew')
  @HttpCode(200)
  @Authenticated()
  @ApiOperation({ summary: 'Renovación en un clic' })
  renewLoan(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.renew.execute({ actor: user, loanId: id });
  }

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: 'Mis préstamos con estado, días restantes y multa acumulada' })
  mine(@CurrentUser() user: AuthUser, @Query() q: MyLoansQuery) {
    return this.queries.myLoans(user.id, q.history ?? false, user.role);
  }

  @Get('policy')
  @Authenticated()
  @ApiOperation({ summary: 'Reglamento vigente (días, renovaciones, multas)' })
  policy() {
    return this.queries.policyView();
  }

  @Get('stats')
  @Roles('LIBRARIAN', 'ADMIN')
  stats() {
    return this.queries.stats();
  }

  @Post('jobs/reminders')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Envía ahora los recordatorios de devolución' })
  runReminders(@Body() dto: RemindersDto) {
    return this.reminders.run(dto.daysAhead ?? 2);
  }

  @Get()
  @Roles('LIBRARIAN', 'ADMIN')
  list(@Query() q: ListLoansQuery) {
    return this.queries.list(q);
  }

  @Get(':id')
  @Authenticated()
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.queries.get(id, user);
  }
}

@ApiTags('penalties')
@Controller('penalties')
export class PenaltiesController {
  constructor(
    private readonly queries: LoanQueries,
    private readonly commands: PenaltyCommands,
  ) {}

  @Get('me')
  @Authenticated()
  mine(@CurrentUser() user: AuthUser) {
    return this.queries.myPenalties(user.id);
  }

  @Get()
  @Roles('LIBRARIAN', 'ADMIN')
  list(@Query() q: PenaltiesQuery) {
    return this.queries.penaltiesList(q.status);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @Roles('LIBRARIAN', 'ADMIN')
  @ApiOperation({ summary: 'Registra el pago de una multa en caja' })
  pay(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.commands.pay(id, user);
  }

  @Post(':id/waive')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Condona una multa (solo administradores)' })
  waive(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: WaiveDto) {
    return this.commands.waive(id, user, dto.reason);
  }
}

/** API interna para n8n (bot de Telegram y recordatorios programados). */
@ApiTags('internal')
@Controller('internal')
export class InternalLoansController {
  constructor(
    private readonly queries: LoanQueries,
    private readonly renew: RenewUseCase,
    private readonly reminders: RemindersJob,
  ) {}

  @Get('users/:userId/loans')
  loansOf(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.queries.myLoans(userId, false);
  }

  @Get('users/:userId/penalties')
  penaltiesOf(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.queries.myPenalties(userId);
  }

  @Post('loans/:id/renew')
  @HttpCode(200)
  renewFor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BotRenewDto) {
    return this.renew.execute({ actor: { id: dto.userId, role: 'STUDENT', name: '', email: '' }, loanId: id });
  }

  @Post('jobs/reminders')
  @HttpCode(200)
  runReminders(@Body() dto: RemindersDto) {
    return this.reminders.run(dto.daysAhead ?? 2);
  }
}
