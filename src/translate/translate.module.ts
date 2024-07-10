import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TranslateService } from './translate.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [TranslateService],
  exports: [TranslateService],
})
export class TranslateModule {}
