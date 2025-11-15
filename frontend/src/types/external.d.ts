declare module "anki-apkg-export" {
  export default class AnkiExport {
    constructor(deckName: string);
    addCard(front: string, back: string): void;
    save(): Promise<Blob>;
  }
}

declare module "anki-apkg-export/dist/exporter" {
  import type { SqlJsStatic } from "sql.js";
  export default class Exporter {
    constructor(
      deckName: string,
      options: { template: string; sql: SqlJsStatic }
    );
    addCard(
      front: string,
      back: string,
      options?: { tags?: string | string[] }
    ): void;
    addMedia(filename: string, data: Blob | ArrayBuffer | string): void;
    save(options?: Record<string, unknown>): Promise<Blob>;
  }
}

declare module "anki-apkg-export/dist/template" {
  export interface TemplateOptions {
    questionFormat?: string;
    answerFormat?: string;
    css?: string;
  }
  export default function createTemplate(
    options?: TemplateOptions
  ): string;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneDark: any;
}

declare module "*.wasm?url" {
  const url: string;
  export default url;
}

declare module "sql.js" {
  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => {
      run(sql: string): void;
      export(): Uint8Array;
      prepare(query: string): {
        getAsObject(params: Record<string, unknown>): void;
      };
    };
  }
  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}

declare module "sql.js/dist/sql-wasm.js" {
  import initSqlJs from "sql.js";
  export default initSqlJs;
}
