import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { useToast } from '@/context/ToastContext'
import { getCourseBySlug, downloadCourseCertificate, previewCourseCertificate } from '@/api/courses'
import { getTrilhaBySlug, downloadTrilhaCertificate, previewTrilhaCertificate } from '@/api/trilhas'
import { downloadBlob } from '@/lib/download'
import { errorMessage } from '@/lib/api'

const CONFIG = {
  course: {
    getDetail: getCourseBySlug,
    preview: previewCourseCertificate,
    download: downloadCourseCertificate,
    label: 'curso',
    listHref: '/biblioteca',
  },
  trilha: {
    getDetail: getTrilhaBySlug,
    preview: previewTrilhaCertificate,
    download: downloadTrilhaCertificate,
    label: 'trilha',
    listHref: '/biblioteca',
  },
}

/**
 * Shows the certificate as an image before the visitor commits to downloading the PDF - the
 * preview is generated fresh from the same data as the download (see CertificateService), not a
 * stored copy, so there is nothing to keep in sync and no separate access-control story to build.
 */
export default function CertificateViewPage({ kind }) {
  const { nickname, slug } = useParams()
  const toast = useToast()
  const [imageUrl, setImageUrl] = useState(null)
  const config = CONFIG[kind]

  const detailQuery = useQuery({
    queryKey: ['certificate-content', kind, nickname, slug],
    queryFn: () => config.getDetail(nickname, slug),
  })
  const contentId = detailQuery.data?.summary.id

  const previewQuery = useQuery({
    queryKey: ['certificate-preview', kind, contentId],
    queryFn: () => config.preview(contentId),
    enabled: Boolean(contentId),
    retry: false,
  })

  useEffect(() => {
    if (!previewQuery.data) return undefined
    const url = URL.createObjectURL(previewQuery.data)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [previewQuery.data])

  const handleDownload = async () => {
    try {
      const blob = await config.download(contentId)
      downloadBlob(blob, 'certificado.pdf')
    } catch (error) {
      toast.error(errorMessage(error, 'Nao foi possivel baixar o certificado.'))
    }
  }

  if (detailQuery.isPending) return <PageLoader label="Carregando..." />

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Nao encontrado"
        message={errorMessage(detailQuery.error, 'Este conteudo nao existe ou nao esta acessivel.')}
        onRetry={detailQuery.refetch}
      />
    )
  }

  const contentName = detailQuery.data.summary.name ?? detailQuery.data.summary.title

  if (previewQuery.isError) {
    return (
      <ErrorState
        title="Certificado indisponivel"
        message={errorMessage(
          previewQuery.error,
          `Voce ainda precisa concluir ${config.label === 'curso' ? 'o curso' : 'a trilha'} para ver o certificado.`,
        )}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link to={config.listHref} className="hover:text-slate-300">
            Biblioteca
          </Link>
          <ChevronRight size={14} />
          <span className="text-slate-300">{contentName}</span>
        </nav>
        <div>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">Certificado de conclusao</h1>
          <p className="mt-1 text-sm text-slate-400">
            {config.label === 'curso' ? 'Curso' : 'Trilha'}{' '}
            <span className="font-medium text-slate-300">{contentName}</span>
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-4 sm:p-8">
        {previewQuery.isPending || !imageUrl ? (
          <div className="flex aspect-[4/3] items-center justify-center">
            <PageLoader label="Gerando certificado..." />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`Certificado de conclusao de ${contentName}`}
            className="mx-auto w-full max-w-3xl rounded-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
          />
        )}
      </div>

      {imageUrl && (
        <div className="flex items-center gap-3">
          <Button onClick={handleDownload}>
            <Download size={16} /> Baixar certificado
          </Button>
        </div>
      )}
    </div>
  )
}
