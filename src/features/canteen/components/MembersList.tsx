/**
 * features/canteen/components/MembersList.tsx
 *
 * Gestão de membros da cantina com cards e ações,
 * seguindo a estrutura da aba de membros do Vite.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MemberForm } from "@/components/forms/MemberForm";
import { Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface RemoteMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance?: number;
  approved?: boolean;
}

export function MembersList() {
  const [members, setMembers] = useState<RemoteMember[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RemoteMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      const response = await fetch("/api/members", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      setMembers(Array.isArray(payload) ? payload : []);
    } catch {
      toast.error("Erro ao carregar membros.");
    }
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    const term = search.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        (member.email?.toLowerCase().includes(term) ?? false) ||
        (member.phone?.toLowerCase().includes(term) ?? false),
    );
  }, [members, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/members/${deleteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("Membro excluído!");
      setDeleteId(null);
      await loadMembers();
    } catch {
      toast.error("Erro ao excluir membro.");
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 justify-between sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setSelectedMember(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedMember(null)}>
                <Plus className="w-4 h-4 mr-2" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedMember ? "Editar Membro" : "Novo Membro"}</DialogTitle>
              </DialogHeader>
              <MemberForm
                member={selectedMember ?? undefined}
                onSuccess={() => {
                  void loadMembers();
                  setDialogOpen(false);
                  setSelectedMember(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{member.name}</h3>
                      {member.approved === false ? <Badge variant="secondary">Pendente</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email || "Sem email"}</p>
                    <p className="text-sm text-muted-foreground">{member.phone || "Sem telefone"}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  {(member.creditBalance ?? 0) > 0 ? (
                    <p className="font-bold text-amber-500">{formatCurrency(member.creditBalance ?? 0)}</p>
                  ) : (
                    <Badge variant="outline" className="border-green-600 text-green-600">Em dia</Badge>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedMember(member); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteId(member.id)}>
                      <Trash2 className="w-4 h-4 mr-2 text-destructive" /> Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Nenhum membro encontrado</p>
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir membro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
