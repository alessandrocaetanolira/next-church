import { NextRequest } from 'next/server';
import { handleSettingsGet, handleSettingsPatch } from '@/server/branding/branding.controller';

export async function GET() { return handleSettingsGet(); }
export async function PATCH(request: NextRequest) { return handleSettingsPatch(request); }
