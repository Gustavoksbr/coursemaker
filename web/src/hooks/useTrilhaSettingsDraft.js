import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trilhaKeys, updateTrilha } from '@/api/trilhas'
import { fieldErrors } from '@/lib/api'

function baselineFrom(trilha) {
  return {
    title: trilha.title,
    description: trilha.description ?? '',
    thumbnailUrl: trilha.thumbnailUrl ?? '',
    categories: trilha.categories ?? [],
    // `?? ''` covers a stale backend deploy that predates the areas feature and omits `area`;
    // AreaSelect auto-picks a real area once the list loads, so this self-heals in the UI.
    areaId: trilha.area?.id ?? '',
    schoolId: trilha.school?.id ?? '',
  }
}

function shallowEqual(a, b) {
  return Object.keys(a).every((key) => {
    if (Array.isArray(a[key])) {
      return Array.isArray(b[key]) && a[key].length === b[key].length && a[key].every((value, index) => value === b[key][index])
    }
    return Object.is(a[key], b[key])
  })
}

/** Local-draft state for a trilha's settings, mirroring `useCourseSettingsDraft`. */
export function useTrilhaSettingsDraft(trilha, trilhaQueryKey) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(() => baselineFrom(trilha))

  useEffect(() => {
    setForm(baselineFrom(trilha))
  }, [trilha])

  const baseline = baselineFrom(trilha)
  const isDirty = !shallowEqual(form, baseline)

  const { mutateAsync, isPending: isFlushing } = useMutation({
    mutationFn: () =>
      updateTrilha(trilha.id, {
        title: form.title.trim(),
        description: form.description,
        thumbnailUrl: form.thumbnailUrl,
        categories: form.categories,
        areaId: form.areaId,
        schoolId: form.schoolId || undefined,
        removeSchool: !form.schoolId,
      }),
    onSuccess: () => {
      setErrors({})
      queryClient.invalidateQueries({ queryKey: trilhaQueryKey })
      queryClient.invalidateQueries({ queryKey: trilhaKeys.all })
    },
    onError: (error) => setErrors(fieldErrors(error)),
  })

  function setField(patch) {
    setForm((current) => ({ ...current, ...patch }))
  }

  async function flush() {
    if (!isDirty) return
    try {
      await mutateAsync()
    } catch (error) {
      error.draftStepLabel = 'as configuracoes da trilha'
      throw error
    }
  }

  return { form, errors, isDirty, isFlushing, setField, flush }
}
