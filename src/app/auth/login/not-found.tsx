export default function LoginNotFound() {
  return <section aria-labelledby="login-not-found-title" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <p className="text-6xl font-bold text-primary">404</p>
    <h1 id="login-not-found-title" className="text-2xl font-semibold">Página não encontrada</h1>
    <p className="max-w-md text-sm text-muted-foreground">O link de acesso está incompleto ou a igreja não está disponível. Solicite o link correto à sua igreja.</p>
  </section>;
}
