import type { SqlJsStatic } from "sql.js";
import initSqlJs from "sql.js/dist/sql-wasm.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import Exporter from "anki-apkg-export/dist/exporter";
import createTemplate from "anki-apkg-export/dist/template";

let sqlInstancePromise: Promise<SqlJsStatic> | null = null;

function getSqlInstance(): Promise<SqlJsStatic> {
  if (!sqlInstancePromise) {
    sqlInstancePromise = initSqlJs({
      locateFile: () => wasmUrl,
    });
  }
  return sqlInstancePromise!;
}

export async function createAnkiExporter(
  deckName: string,
  templateOptions?: Parameters<typeof createTemplate>[0]
) {
  const sql = await getSqlInstance();
  return new Exporter(deckName, {
    template: createTemplate(templateOptions),
    sql,
  });
}
