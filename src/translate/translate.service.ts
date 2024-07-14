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

const passReg = /^\r\n|^\r|^\n|^\s*\[/;
const breakingReg = /\r\n|\r|\n/;

const splitIntoChunk = <T>(arr: T[], chunk: number): T[][] => {
  const array = [...arr];
  const result: T[][] = [];

  while (array.length > 0) {
    const tempArray = array.splice(0, chunk);
    result.push(tempArray);
  }

  return result;
};

@Injectable()
export class TranslateService {
  private readonly logger = new Logger('Translate');

  private readonly apiKey: string;
  private readonly sourceLang: deepl.SourceLanguageCode | null;
  private readonly targetLang: deepl.TargetLanguageCode;
  private readonly encoding: BufferEncoding;
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
    this.encoding =
      this.configService.get<BufferEncoding>('ENCODING') ?? 'utf8';
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
    const content = await readFile(inputFilePath, { encoding: this.encoding });
    const lines: string[][] = splitIntoChunk<string>(
      content.split(breakingReg),
      20,
    );

    const translatedLines: string[] = [];

    let count = 0;

    const log = () => {
      this.logger.log(`${((++count / lines.length) * 100).toFixed(2)}%`);
      console.log(count, lines.length);
    };

    for (const lineArray of lines) {
      const texts: Map<number, { key: string; text: string }> = new Map();

      lineArray.forEach((line, index) => {
        if (passReg.test(line)) {
          return;
        }

        let [key, text] = line.split('|');

        if (!text) {
          text = key;
          key = '';
        }

        text = text.replace(breakingReg, '');
        if (text) {
          texts.set(index, { key, text });
        }
      });

      let translatedTexts: string[];
      const sendTexts = Array.from(texts.keys())
        .sort()
        .map((index) => texts.get(index).text);

      try {
        const result = await this.translator.translateText(
          sendTexts,
          this.sourceLang,
          this.targetLang,
          { formality: 'prefer_less' },
        );
        translatedTexts = result.map(({ text }) => text);
      } catch (e) {
        this.logger.error(e);
        translatedTexts = sendTexts;
      }

      let translatedTextCount = 0;

      lineArray.forEach((line, index) => {
        if (texts.has(index)) {
          const { key } = texts.get(index);
          const translatedText = translatedTexts[translatedTextCount++];

          if (key) {
            translatedLines.push(`${key}|${translatedText}`);
          } else {
            translatedLines[translatedLines.length - 1] += ` ${translatedText}`;
          }
        } else {
          translatedLines.push(line);
        }
      });

      log();
    }

    await writeFile(outputFilePath, translatedLines.join('\n'), {
      encoding: this.encoding,
    });

    this.logger.log(`Translation success: ${outputFilePath}`);
  }
}
