import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import * as deepl from 'deepl-node';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);

@Injectable()
export class TranslateService {
  private readonly logger = new Logger('Translate');

  private readonly apiKey: string;
  private readonly sourceLang: deepl.SourceLanguageCode | null;
  private readonly targetLang: deepl.TargetLanguageCode;
  private translator: deepl.Translator;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPL_API_KEY');
    this.sourceLang =
      this.configService.get<deepl.SourceLanguageCode | undefined>(
        'SOURCE_LANG',
      ) ?? null;
    this.targetLang =
      this.configService.get<deepl.TargetLanguageCode>('TARGET_LANG');
    this.translator = new deepl.Translator(this.apiKey);
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

        let translatedText: string;

        try {
          const result = await this.translator.translateText(
            text,
            this.sourceLang,
            this.targetLang,
            { formality: 'prefer_less' },
          );
          translatedText = result.text;
        } catch (e) {
          this.logger.error(e);
          translatedText = text;
        }

        return `${key}|${translatedText}`;
      }),
    );

    await writeFile(outputFilePath, translatedLines.join('\n'), {
      encoding: 'utf16le',
    });

    this.logger.log(`Translation success: ${outputFilePath}`);
  }
}
