import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

/**
 * Catches any render error React Router's data router surfaces (a bad API response shape, a
 * frontend/backend version mismatch during a staggered deploy, a genuine bug) and shows a plain
 * "something broke, reload" screen instead of React Router's default raw stack-trace page. This is
 * the last line of defence - most such crashes should be prevented upstream (see
 * `lib/contentLinks.js`), but this keeps a gap in that coverage from taking down the whole app.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()
  if (import.meta.env.DEV) {
    console.error(error)
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="text-amber-500" size={40} />
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Algo deu errado</h1>
        <p className="mt-2 text-sm text-slate-400">
          Essa pagina encontrou um erro inesperado. Tente recarregar - se persistir, pode ser uma
          instabilidade temporaria do servidor.
        </p>
      </div>
      <button type="button" onClick={() => window.location.reload()} className="btn-primary">
        Recarregar pagina
      </button>
    </div>
  )
}
