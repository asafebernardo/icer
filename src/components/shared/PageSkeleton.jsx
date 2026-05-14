import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton para conteúdo de página (após navbar e header já renderizados).
 * Use quando uma página está carregando dados pesados de um único recurso
 * (ex.: EventoPage, PostPage).
 */
export default function PageSkeleton({ cards = 3 }) {
  return (
    <div className="container-page py-8 sm:py-12 space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-9/12" />
      </div>
    </div>
  );
}
