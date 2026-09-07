'use client';

import { useMembers } from '../hooks/use-members';
import { Card, CardContent } from '@/components/ui/card';

export function MemberList() {
  const { members, isLoading } = useMembers();

  if (isLoading) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <div className="grid gap-4">
      {members.map(member => (
        <Card key={member.id}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
