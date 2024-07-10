import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranslateModule } from './translate/translate.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    TranslateModule,
  ],
})
export class AppModule {}
