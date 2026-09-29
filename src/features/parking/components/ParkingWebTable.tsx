'use client';

import { Send } from 'lucide-react';
import type { ParkingGroup, ParkingSpot } from '@/features/parking/api/parking.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ParkingWebTableProps = { spots: ParkingSpot[]; groups: ParkingGroup[]; canUpdate: boolean; canDelete: boolean; onEdit: (spot: ParkingSpot) => void; onToggle: (spot: ParkingSpot) => void; onNotify: (spot: ParkingSpot) => void; onDelete: (spot: ParkingSpot) => void };

export function ParkingWebTable({ spots, groups, canUpdate, canDelete, onEdit, onToggle, onNotify, onDelete }: ParkingWebTableProps) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card"><Table><TableHeader><TableRow><TableHead>Vaga</TableHead><TableHead>Grupo</TableHead><TableHead>Status</TableHead><TableHead>Ocupante</TableHead><TableHead className="w-[260px] text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
    {spots.map((spot) => <TableRow key={spot.id}><TableCell className="font-medium">{spot.label}</TableCell><TableCell>{groups.find((group) => group.id === spot.groupId)?.name ?? 'Grupo'}</TableCell><TableCell><Badge variant={spot.status === 'free' ? 'secondary' : 'default'}>{spot.status === 'free' ? 'Livre' : 'Ocupada'}</Badge></TableCell><TableCell>{spot.occupiedByName || 'Sem ocupação'}</TableCell><TableCell><div className="flex justify-end gap-1">{canUpdate ? <><Button size="sm" variant="outline" onClick={() => onEdit(spot)}>Editar</Button><Button size="sm" variant={spot.status === 'free' ? 'default' : 'secondary'} onClick={() => onToggle(spot)}>{spot.status === 'free' ? 'Ocupar' : 'Liberar'}</Button></> : null}{spot.occupiedByMemberId ? <Button size="icon" variant="outline" onClick={() => onNotify(spot)} aria-label="Avisar responsável"><Send className="h-4 w-4" /></Button> : null}{canDelete ? <Button size="sm" variant="destructive" onClick={() => onDelete(spot)}>Remover</Button> : null}</div></TableCell></TableRow>)}
    {spots.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhuma vaga encontrada.</TableCell></TableRow> : null}
  </TableBody></Table></div>;
}
