import { EmptyState } from "@/components/common/EmptyState";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen-dvh items-center justify-center bg-background p-6">
      <EmptyState
        className="w-full max-w-md border-solid"
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
            CA
          </div>
        }
        title="Você está offline"
        description="Alguns dados continuam disponíveis no app, mas esta tela precisa de conexão para atualizar."
      />
    </main>
  );
}
