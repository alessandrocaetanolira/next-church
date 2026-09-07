export default function OfflinePage() {
  return (
    <main className="flex min-h-screen-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
          CA
        </div>
        <h1 className="text-xl font-semibold">Você está offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Alguns dados continuam disponíveis no app, mas esta tela precisa de conexão para atualizar.
        </p>
      </div>
    </main>
  );
}
