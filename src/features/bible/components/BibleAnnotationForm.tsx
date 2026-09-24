'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';

type BibleAnnotationFormProps = {
  reference: string;
  initialNote?: string;
  title?: string;
  onCancel: () => void;
  onSave: (note: string) => Promise<void>;
};

export function BibleAnnotationForm({ reference, initialNote = '', title = 'Nova anotação', onCancel, onSave }: BibleAnnotationFormProps) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const value = note.trim();
    if (!value) return;
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  };

  return <>
    <DrawerHeader className="border-b text-left">
      <DrawerTitle>{title}</DrawerTitle>
      <p className="text-sm font-medium text-primary">{reference}</p>
    </DrawerHeader>
    <div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={6} placeholder="Escreva sua anotação…" autoFocus />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="button" onClick={submit} disabled={!note.trim() || saving}>{saving ? 'Salvando…' : 'Salvar anotação'}</Button>
      </div>
    </div>
  </>;
}
