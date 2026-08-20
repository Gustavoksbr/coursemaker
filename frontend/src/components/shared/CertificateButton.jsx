import { useMutation } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/context/ToastContext'
import { downloadCourseCertificate } from '@/api/courses'
import { downloadTrilhaCertificate } from '@/api/trilhas'
import { downloadBlob } from '@/lib/download'
import { errorMessage } from '@/lib/api'

const DOWNLOAD_FN = {
  course: downloadCourseCertificate,
  trilha: downloadTrilhaCertificate,
}

/** Shown once the viewer has finished the course/trilha - downloads the PDF certificate. */
export function CertificateButton({ kind, contentId }) {
  const toast = useToast()

  const { mutate: download, isPending } = useMutation({
    mutationFn: () => DOWNLOAD_FN[kind](contentId),
    onSuccess: (blob) => downloadBlob(blob, 'certificado.pdf'),
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel gerar o certificado.')),
  })

  return (
    <Button variant="secondary" onClick={() => download()} loading={isPending}>
      <Award size={16} /> Baixar certificado
    </Button>
  )
}
