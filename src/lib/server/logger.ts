import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

type LogData = unknown;

const logTimeFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Apresenta logs no horário de Brasília; persistência e eventos continuam em UTC. */
function eventTimestamp(date = new Date()) {
  return logTimeFormatter.format(date);
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
