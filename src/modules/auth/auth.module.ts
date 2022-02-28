import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, DataService],
})
export class AuthModule {}
