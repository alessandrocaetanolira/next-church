'use client';

import Link from 'next/link';

type Mention = { id: string; name: string; handle: string };

export function MentionText({ content, mentions = [], className = '' }: { content: string; mentions?: Mention[]; className?: string }) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const byHandle = new Map<string, Mention>();
  for (const mention of mentions) {
    byHandle.set(normalize(mention.handle), mention);
    byHandle.set(normalize(mention.name), mention);
    byHandle.set(normalize(mention.name.split(/\s+/)[0]), mention);
  }
  const parts = content.split(/(@[\p{L}\p{N}._-]+)/gu);
  return <p className={className}>{parts.map((part, index) => { if (!part.startsWith('@')) return <span key={index}>{part}</span>; const mention = byHandle.get(normalize(part.slice(1))); return mention ? <Link key={index} href={`/perfil/${mention.id}`} onClick={(event) => event.stopPropagation()} className="rounded-sm bg-primary px-1 font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">{part}</Link> : <span key={index}>{part}</span>; })}</p>;
}
