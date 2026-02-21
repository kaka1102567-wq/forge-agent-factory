export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">FORGE</h1>
          <p className="text-sm text-muted-foreground">Agent Factory</p>
        </div>
        {children}
      </div>
    </div>
  );
}
