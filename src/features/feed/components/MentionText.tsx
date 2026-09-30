'use client';

import Link from 'next/link';

type Mention = { id: string; name: string; handle: string };

export function MentionText({ content, mentions = [], className = '' }: { content: string; mentions?: Mention[]; className?: string }) {
  const byHandle = new Map(mentions.map((mention) => [mention.handle.toLowerCase(), mention]));
  const parts = content.split(/(@[\p{L}\p{N}._-]+)/gu);
  return <p className={className}>{parts.map((part, index) => { if (!part.startsWith('@')) return <span key={index}>{part}</span>; const mention = byHandle.get(part.slice(1).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')); return mention ? <Link key={index} href={`/perfil/${mention.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-primary hover:underline">{part}</Link> : <span key={index}>{part}</span>; })}</p>;
}
