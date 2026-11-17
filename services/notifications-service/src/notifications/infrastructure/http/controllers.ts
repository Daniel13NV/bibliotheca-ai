import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, AuthUser, CurrentUser } from '../../../shared/auth';
import { InboxQueries, NotifyUseCase } from '../../application/notification.use-cases';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly inbox: InboxQueries,
    private readonly notify: NotifyUseCase,
  ) {}

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: 'Bandeja de notificaciones del usuario' })
  mine(@CurrentUser() user: AuthUser) {
    return this.inbox.inbox(user.id);
  }

  @Post('me/read-all')
  @HttpCode(200)
  @Authenticated()
  readAll(@CurrentUser() user: AuthUser) {
    return this.inbox.markAllRead(user.id);
  }

  @Post('me/test')
  @HttpCode(200)
  @Authenticated()
  @ApiOperation({ summary: 'Envía una notificación de prueba (Telegram + bandeja)' })
  test(@CurrentUser() user: AuthUser) {
    return this.notify.test(user.id, user.name);
  }

  @Post(':id/read')
  @HttpCode(200)
  @Authenticated()
  read(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.markRead(user.id, id);
  }
}
