import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GatewayController } from './gateway.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev-jwt-secret' })],
  controllers: [GatewayController],
})
export class AppModule {}
