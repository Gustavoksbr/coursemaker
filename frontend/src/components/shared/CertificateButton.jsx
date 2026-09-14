import { Link } from 'react-router-dom'
import { Award } from 'lucide-react'
import { courseHref, trilhaHref } from '@/lib/contentLinks'

const HREF_FN = {
  course: courseHref,
  trilha: trilhaHref,
}

/** Shown once the viewer has finished the course/trilha - opens the certificate to view and download. */
export function CertificateButton({ kind, content }) {
  return (
    <Link to={`${HREF_FN[kind](content)}/certificado`} className="btn-secondary">
      <Award size={16} /> Ver certificado
    </Link>
  )
}
