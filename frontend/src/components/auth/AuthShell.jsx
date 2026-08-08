import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

/** Centred card used by login, register and the nickname setup step. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-100">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-white">
            <GraduationCap size={22} />
          </span>
          <span className="text-lg font-bold">CourseMaker</span>
        </Link>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-5 text-center text-sm text-slate-400">{footer}</div>}
    </div>
  )
}
