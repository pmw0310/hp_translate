import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranslateService } from './translate.service';

@Module({
  imports: [ConfigModule],
  providers: [TranslateService],
  exports: [TranslateService],
})
export class TranslateModule {}
