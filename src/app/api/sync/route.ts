import { NextResponse } from 'next/server';
import { getRetiredSyncResponse } from '@/server/canteen/legacy-sync.controller';

/** Não aceitar mais o contrato legado de upsert bruto; o PWA atual usa /pull e /push. */
export function GET() {
  return NextResponse.json(getRetiredSyncResponse(), { status: 410 });
}

export function POST() {
  return NextResponse.json(getRetiredSyncResponse(), { status: 410 });
}
