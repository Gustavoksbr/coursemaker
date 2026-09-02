import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Compass className="text-slate-700" size={40} />
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Pagina nao encontrada</h1>
        <p className="mt-2 text-sm text-slate-400">
          O endereco que voce abriu nao existe ou foi movido.
        </p>
      </div>
      <div className="flex gap-2">
        <Link to="/" className="btn-primary">
          Voltar para a home
        </Link>
        <Link to="/pesquisar" className="btn-secondary">
          Ver conteudo
        </Link>
      </div>
    </div>
  )
}
