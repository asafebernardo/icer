import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de rota inteira — para usar como fallback em verificações de auth
 * (PrivateRoute, AdminRoute, ProtectedRoute) ou carregamento de configurações
 * públicas. Imita a estrutura visual da página para reduzir layout shift.
 */
export default function RouteSkeleton() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Navbar placeholder */}
      <div className="h-[4.5rem] border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="container-page h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Conteúdo placeholder */}
      <div className="flex-1 container-page py-8 sm:py-12 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
