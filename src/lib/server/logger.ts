import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

type LogData = unknown;

function eventTimestamp() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function logFilePath() {
  const date = eventTimestamp().slice(0, 10);
  return path.join(process.env.LOG_DIR?.trim() || path.join(process.cwd(), 'logs'), `${date}.log`);
}

function appendToDailyFile(line: string) {
  try {
    const file = logFilePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${line}\n`, 'utf8');
  } catch {
    // Logs em arquivo são auxiliares; não podem interromper uma requisição.
  }
}

function write(method: 'info' | 'warn' | 'error', scope: string, message: string, data?: LogData) {
  const prefix = `[${eventTimestamp()}][${scope}] ${message}`;
  const serializedData = data === undefined ? '' : ` ${util.inspect(data, { depth: 8, colors: false, breakLength: Infinity })}`;
  appendToDailyFile(`${prefix}${serializedData}`);
  if (data === undefined) {
    console[method](prefix);
    return;
  }
  console[method](prefix, data);
}

export const serverLogger = {
  info: (scope: string, message: string, data?: LogData) => write('info', scope, message, data),
  warn: (scope: string, message: string, data?: LogData) => write('warn', scope, message, data),
  error: (scope: string, message: string, data?: LogData) => write('error', scope, message, data),
};
