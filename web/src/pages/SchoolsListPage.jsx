import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Landmark } from 'lucide-react'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { listSchools, schoolKeys } from '@/api/schools'
import { errorMessage } from '@/lib/api'

/**
 * Public listing of all schools that have published content on the platform.
 * Shows school cards with logo, name, description and link to their individual page.
 */
export default function SchoolsListPage() {
    const { data: schools, isPending, isError, error, refetch } = useQuery({
        queryKey: schoolKeys.list(),
        queryFn: listSchools,
    })

    if (isPending) return <PageLoader label="Carregando escolas..." />

    if (isError) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <ErrorState message={errorMessage(error)} onRetry={refetch} />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-100">Escolas</h1>
                <p className="max-w-2xl text-slate-400">
                    Procedencia do conteudo publicado aqui, nao uma parceria oficial. Explore o conteudo
                    disponibilizado por cada escola.
                </p>
            </header>

            {schools.length === 0 ? (
                <div className="card p-12 text-center">
                    <Landmark size={48} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-300">Nenhuma escola cadastrada ainda</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Em breve teremos escolas publicando conteudo por aqui.
                    </p>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {schools.map((school) => (
                        <Link
                            key={school.id}
                            to={`/escolas/${school.slug}`}
                            className="card group flex flex-col gap-4 p-6 transition-colors hover:border-brand-500"
                        >
                            <div className="flex items-start gap-4">
                                {school.logoUrl ? (
                                    <img
                                        src={school.logoUrl}
                                        alt={school.name}
                                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                                    />
                                ) : (
                                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
                                        <Landmark size={24} />
                                    </span>
                                )}

                                <div className="min-w-0 flex-1">
                                    <h2 className="font-bold text-slate-100 group-hover:text-brand-400">
                                        {school.name}
                                    </h2>
                                    {school.description && (
                                        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-400">
                                            {school.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
                                <span className="text-sm text-slate-500">Ver conteudo</span>
                                <ArrowRight
                                    size={16}
                                    className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-brand-400"
                                />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
