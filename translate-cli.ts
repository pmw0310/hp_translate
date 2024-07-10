import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './src/app.module';
import { TranslateService } from './src/translate/translate.service';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('Translate');
  const app = await NestFactory.createApplicationContext(AppModule);
  const translateService = app.get(TranslateService);

  const folderPath = process.argv[2];
  const outputFolderPath = process.argv[3];

  if (!folderPath || !outputFolderPath) {
    logger.error('Please provide the input and output folder paths.');
    process.exit(1);
  }

  await translateService.translateFolder(
    path.resolve(folderPath),
    path.resolve(outputFolderPath),
  );

  logger.log('Translation completed');
  await app.close();
}

bootstrap();
