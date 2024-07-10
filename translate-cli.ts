import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TranslateService } from './src/translate/translate.service';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const translateService = app.get(TranslateService);

  const folderPath = process.argv[2];
  const outputFolderPath = process.argv[3];

  if (!folderPath || !outputFolderPath) {
    console.error('Please provide the input and output folder paths.');
    process.exit(1);
  }

  await translateService.translateFolder(
    path.resolve(folderPath),
    path.resolve(outputFolderPath),
  );

  console.log('Translation completed');
  await app.close();
}

bootstrap();
