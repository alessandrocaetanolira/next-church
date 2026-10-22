// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const execute = promisify(execFile);
let directory: string | undefined;
afterEach(() => { if (directory) fs.rmSync(directory, { recursive: true, force: true }); });

describe('rate limit persistente entre processos reais', () => {
  it('compartilha a quota e mantém o bloqueio após reiniciar o processo', async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-rate-process-'));
    const filename = path.join(directory, 'security.db');
    const script = `
      const { AuthRateLimitStore } = require('./src/lib/server/auth-rate-limit-store.ts');
      const store = new AuthRateLimitStore(process.argv[1]);
      (async () => {
        try {
          const results = await Promise.all(Array.from({length: 12}, () => store.consume('shared-account', 5, 60000)));
          process.stdout.write(JSON.stringify(results.filter(x => x.allowed).length));
        } finally { await store.disconnect(); }
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `;
    const run = async () => {
      const { stdout } = await execute(process.execPath, ['--import', 'tsx', '-e', script, filename], { cwd: process.cwd() });
      expect(stdout).toMatch(/^\d+$/);
      return Number(stdout);
    };
    const admitted = await Promise.all([run(), run()]);
    expect(admitted[0] + admitted[1]).toBe(5);
    expect(await run()).toBe(0);
  }, 20_000);
});
