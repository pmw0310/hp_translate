import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);

@Injectable()
export class TranslateService {
  private readonly logger = new Logger('Translate');

  private readonly apiKey: string;
  private readonly apiUrl = 'https://api-free.deepl.com/v2/translate';
  private readonly sourceLang: string;
  private readonly targetLang: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPL_API_KEY');
    this.sourceLang = this.configService.get<string>('SOURCE_LANG');
    this.targetLang = this.configService.get<string>('TARGET_LANG');
  }

  async translateFolder(
    folderPath: string,
    outputFolderPath: string,
  ): Promise<void> {
    const files = await readdir(folderPath);
    const txtFiles = files.filter((file) => file.endsWith('.txt'));

    try {
      await readdir(outputFolderPath);
    } catch {
      await mkdir(outputFolderPath, { recursive: true });
    }

    for (const file of txtFiles) {
      const inputFilePath = path.join(folderPath, file);
      const outputFilePath = path.join(outputFolderPath, file);
      await this.translateFile(inputFilePath, outputFilePath);
    }
  }

  async translateFile(
    inputFilePath: string,
    outputFilePath: string,
  ): Promise<void> {
    const content = await readFile(inputFilePath, { encoding: 'utf16le' });
    let lines: string[];
    lines = content.split('\n');

    if (lines.length === 1) {
      lines = content.split('\r');
    }

    const translatedLines = await Promise.all(
      lines.map(async (line) => {
        if (
          line === '\n' ||
          line === '\r' ||
          (line.startsWith('[') &&
            (line.endsWith(']\r') || line.endsWith(']\n')))
        ) {
          return line;
        }

        const [key, text] = line.split('|');
        if (!text) {
          return line;
        }

        const translatedText = await this.translateText(text);
        return `${key}|${translatedText}`;
      }),
    );

    await writeFile(outputFilePath, translatedLines.join('\n'), {
      encoding: 'utf16le',
    });

    this.logger.log(`Translation success: ${outputFilePath}`);
  }

  async translateText(text: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          new URLSearchParams({
            auth_key: this.apiKey,
            text: text,
            target_lang: this.targetLang,
            source_lang: this.sourceLang,
          }),
        ),
      );
      return response.data.translations[0].text;
    } catch (err) {
      this.logger.error(`Translation error: ${err}`);
      return text; // 번역 실패 시 원문 반환
    }
  }
}
