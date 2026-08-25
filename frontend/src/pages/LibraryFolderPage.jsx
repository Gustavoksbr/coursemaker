import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bookmark, Folder, Pencil, Trash2 } from 'lucide-react'
import { LibraryItemCard } from '@/components/library/LibraryItemCard'
import { FolderModal } from '@/components/library/FolderModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { useToast } from '@/context/ToastContext'
import { useCurrentArea } from '@/context/AreaContext'
import { deleteFolder, getFolder, libraryKeys, listFolderItems } from '@/api/library'
import { errorMessage, statusOf } from '@/lib/api'

export default function LibraryFolderPage() {
  const { areaSlug, folderId } = useParams()
  const { area } = useCurrentArea()
  const areaId = area?.id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const folderQuery = useQuery({
    queryKey: libraryKeys.folder(folderId, areaId),
    queryFn: () => getFolder(folderId, areaId),
    enabled: Boolean(areaId),
  })
  const itemsQuery = useQuery({
    queryKey: libraryKeys.folderItems(folderId, page, areaId),
    queryFn: () => listFolderItems(folderId, page, 12, areaId),
    enabled: Boolean(areaId),
    placeholderData: (previous) => previous,
  })

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: () => deleteFolder(folderId),
    onSuccess: () => {
      // Its items move into Favoritos, so that folder's listing is stale too -- not just the
      // folder list itself.
      queryClient.invalidateQueries({ queryKey: ['library'] })
      toast.success('Pasta excluida. Os itens voltaram para Favoritos.')
      navigate(`/${areaSlug}/biblioteca`)
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel excluir a pasta.')),
  })

  if (folderQuery.isPending) return <PageLoader label="Carregando pasta..." />

  if (folderQuery.isError) {
    if (statusOf(folderQuery.error) === 404) {
      return <Navigate to={`/${areaSlug}/biblioteca`} replace />
    }
    return (
      <ErrorState
        title="Nao foi possivel abrir a pasta"
        message={errorMessage(folderQuery.error)}
        onRetry={folderQuery.refetch}
      />
    )
  }

  const folder = folderQuery.data
  // Favoritos is a real folder like any other, except it is the one every save falls back to --
  // renaming or deleting it would leave that fallback with nowhere to go.
  const Icon = folder.isDefault ? Bookmark : Folder

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Link to={`/${areaSlug}/biblioteca`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft size={15} /> Biblioteca
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Icon className="text-brand-400" /> {folder.name}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{folder.itemCount} item(ns)</p>
        </div>
        {!folder.isDefault && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditOpen(true)} className="btn-secondary text-sm">
              <Pencil size={15} /> Renomear
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">
              <Trash2 size={15} /> Excluir pasta
            </button>
          </div>
        )}
      </div>

      {itemsQuery.isError ? (
        <ErrorState message={errorMessage(itemsQuery.error)} onRetry={itemsQuery.refetch} />
      ) : itemsQuery.isPending ? (
        <CardSkeletonGrid count={6} />
      ) : itemsQuery.data.items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title="Pasta vazia"
          message="Use o marcador em um curso, post ou trilha para salva-lo aqui."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {itemsQuery.data.items.map((item) => (
              <LibraryItemCard key={item.id} item={item} />
            ))}
          </div>
          <Pagination
            page={itemsQuery.data.page}
            totalPages={itemsQuery.data.totalPages}
            onChange={(next) => {
              setPage(next)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="pt-4"
          />
        </>
      )}

      <FolderModal open={editOpen} onClose={() => setEditOpen(false)} folder={folder} />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove()}
        loading={deleting}
        title="Excluir pasta"
        message="Os itens desta pasta voltam para Favoritos. Nada e removido da sua biblioteca."
        confirmLabel="Excluir pasta"
      />
    </div>
  )
}
