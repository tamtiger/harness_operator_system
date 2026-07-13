declare module '@nlpjs/core' {
  export function containerBootstrap(): Promise<any>;
}

declare module '@nlpjs/nlp' {
  export class Nlp {
    settings: { autoSave: boolean };
    addLanguage(lang: string): void;
    addDocument(lang: string, utterance: string, intent: string): void;
    addAnswer(lang: string, intent: string, answer: string): void;
    train(): Promise<void>;
    process(lang: string, utterance: string): Promise<{
      intent: string;
      score: number;
      classifications: Array<{ intent: string; score: number }>;
      entities: any[];
      sentiment: any;
    }>;
  }
}

declare module '@nlpjs/lang-en' {
  export class LangEn {
    name: string;
  }
}
