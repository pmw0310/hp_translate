import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TranslateModule } from './translate/translate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TranslateModule,
  ],
})
export class AppModule {}
