import { api } from '@/lib/api'

/** Whether the "enviar imagem" button should show at all, cached for the whole session. */
export async function getCloudinaryStatus() {
  const { data } = await api.get('/uploads/cloudinary-status')
  return data.enabled
}

/** A one-time signature for a direct-to-Cloudinary upload. The API secret never reaches here. */
export async function getCloudinaryUploadSignature() {
  const { data } = await api.post('/uploads/cloudinary-signature')
  return data
}

export const uploadKeys = {
  cloudinaryStatus: ['uploads', 'cloudinary-status'],
}
