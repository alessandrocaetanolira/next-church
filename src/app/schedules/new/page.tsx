'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WebPageLayout } from '@/components/shared/web';
import { useTasks } from '@/features/schedules/hooks/use-tasks';
import { useTeams } from '@/features/schedules/hooks/use-teams';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasActionPermission } from '@/lib/access-control';

export default function NewSchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addTask } = useTasks();
  const { teams, isLoading: teamsLoading } = useTeams();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', teamId: '', date: '', type: 'culto', recurrence: 'none' });

  useEffect(() => {
    if (!form.teamId && teams[0]) setForm((current) => ({ ...current, teamId: teams[0].id }));
  }, [form.teamId, teams]);

  const canCreate = hasActionPermission(user, 'tasks', 'create');

  const save = async () => {
    if (!canCreate) {
      toast.error('Você não tem permissão para criar escalas.');
      return;
    }
    if (!form.title.trim() || !form.date || !form.teamId) {
      toast.error('Preencha título, equipe e data.');
      return;
    }
    setSaving(true);
    try {
      await addTask({
        title: form.title.trim(),
        description: form.description.trim(),
        teamId: form.teamId,
        date: new Date(form.date).toISOString(),
        status: 'pending',
        type: form.type,
        recurrence: form.recurrence,
      });
      router.push('/schedules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WebPageLayout title="Nova Escala" description="Cadastre uma nova tarefa para uma equipe.">
      <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
        <Button type="button" variant="ghost" className="-ml-2" onClick={() => router.push('/schedules')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para escalas
        </Button>
        <div className="space-y-2">
          <Label htmlFor="schedule-title">Título</Label>
          <Input id="schedule-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Recepção do culto" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule-description">Descrição</Label>
          <Textarea id="schedule-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Orientações para a equipe" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Equipe</Label>
            <Select value={form.teamId} onValueChange={(value) => setForm((current) => ({ ...current, teamId: value }))}>
              <SelectTrigger><SelectValue placeholder={teamsLoading ? 'Carregando...' : 'Selecione a equipe'} /></SelectTrigger>
              <SelectContent>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-date">Data e horário</Label>
            <Input id="schedule-date" type="datetime-local" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="culto">Culto</SelectItem><SelectItem value="evento">Evento</SelectItem><SelectItem value="reuniao">Reunião</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={form.recurrence} onValueChange={(value) => setForm((current) => ({ ...current, recurrence: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={() => void save()} disabled={saving || teamsLoading}>
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Salvando...' : 'Criar escala'}
        </Button>
      </div>
    </WebPageLayout>
  );
}
