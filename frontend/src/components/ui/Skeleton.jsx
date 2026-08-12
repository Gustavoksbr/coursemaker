import { cn } from '@/lib/cn'

/**
 * Skeleton loading placeholder components for better perceived performance.
 * Use these instead of spinners for content that has a predictable layout.
 */

export function Skeleton({ className }) {
    return (
        <div
            className={cn('animate-pulse rounded-lg bg-slate-800/60', className)}
            aria-hidden="true"
        />
    )
}

/**
 * Skeleton for the course curriculum sidebar.
 */
export function CurriculumSkeleton() {
    return (
        <div className="space-y-1 p-3" aria-label="Carregando conteúdo...">
            {/* Progress bar skeleton */}
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="mt-2 h-4 w-24" />
            </div>

            {/* Module skeletons */}
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5">
                        <Skeleton className="h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    {/* Lesson skeletons */}
                    <div className="ml-5 space-y-0.5 border-l border-slate-700 pl-2">
                        {[...Array(4)].map((_, j) => (
                            <div key={j} className="flex items-center gap-2 rounded-lg px-3 py-2">
                                <Skeleton className="h-4 w-4 shrink-0" />
                                <Skeleton className="h-3.5 w-2/3 flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

/**
 * Skeleton for lesson content (blocks).
 */
export function LessonContentSkeleton() {
    return (
        <div className="space-y-6" aria-label="Carregando aula...">
            {/* Header skeleton */}
            <div className="border-b border-slate-800 pb-5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-2 h-8 w-3/4" />
            </div>

            {/* Content blocks skeleton */}
            {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3">
                    {/* Alternate between text and code blocks */}
                    {i % 3 === 0 ? (
                        // Code block skeleton
                        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ) : (
                        // Text block skeleton
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/6" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

/**
 * Skeleton for course landing page.
 */
export function CourseLandingSkeleton() {
    return (
        <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
            {/* Header */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-full" />

                {/* Author and actions */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Skeleton className="h-10 w-10" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                {/* Thumbnail */}
                <Skeleton className="aspect-video w-full rounded-xl" />
            </div>

            {/* Stats */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4">
                <div className="flex gap-6">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-40" />
                </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>

            {/* Curriculum */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-2">
                    <CurriculumSkeleton />
                </div>
            </div>
        </div>
    )
}
