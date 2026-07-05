/**
 * SCOPED ambient declaration for Node's built-in `node:sqlite` module.
 *
 * WHY: this package pins `@types/node@^20`, which predates `node:sqlite` (added in Node 22,
 * stabilized in 24). Rather than bump `@types/node` (a broad ripple across the whole app),
 * we declare ONLY the surface the sqlite adapter actually uses. The runtime module is the
 * genuine built-in — this file just teaches `tsc` its shape.
 */
declare module 'node:sqlite' {
  export class StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): any;
    all(...params: unknown[]): any[];
  }

  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
