'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';

type MentionMember = { id: string; name: string; email?: string | null };

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function MentionTextarea({ members, value, onChange, ...props }: Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'> & {
  members: MentionMember[];
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [cursor, setCursor] = useState(0);
  const token = value.slice(0, cursor).match(/@([\p{L}\p{N}._-]*)$/u)?.[1] ?? '';
  const suggestions = useMemo(() => {
    if (!token) return [];
    const query = normalize(token);
    return members.filter((member) => normalize(member.name).startsWith(query) || normalize(member.name.split(/\s+/)[0]).startsWith(query)).slice(0, 6);
  }, [members, token]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCursor(event.target.selectionStart ?? event.target.value.length);
    onChange?.(event);
  };

  const selectMention = (member: MentionMember) => {
    const current = value.slice(0, cursor);
    const match = current.match(/@([\p{L}\p{N}._-]*)$/u);
    if (!match) return;
    const start = current.length - match[0].length;
    const label = `@${member.name.split(/\s+/)[0]} `;
    const nextValue = `${value.slice(0, start)}${label}${value.slice(cursor)}`;
    const nextCursor = start + label.length;
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLTextAreaElement>);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(nextCursor, nextCursor);
      setCursor(nextCursor);
    });
  };

  return (
    <div className="relative">
      <Textarea ref={ref} {...props} value={value} onChange={handleChange} onKeyUp={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)} onClick={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)} />
      {suggestions.length ? (
        <div className="absolute inset-x-0 bottom-full z-20 mb-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {suggestions.map((member) => <button key={member.id} type="button" className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onMouseDown={(event) => { event.preventDefault(); selectMention(member); }}><span className="font-medium">{member.name}</span>{member.email ? <span className="ml-2 truncate text-xs text-muted-foreground">{member.email}</span> : null}</button>)}
        </div>
      ) : null}
    </div>
  );
}
