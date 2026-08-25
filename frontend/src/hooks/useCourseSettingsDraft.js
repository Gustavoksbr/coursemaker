import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { courseKeys, updateCourse } from '@/api/courses'
import { fieldErrors } from '@/lib/api'

function baselineFrom(course, landingDescription) {
  return {
    name: course.name,
    description: course.description ?? '',
    landingDescription: landingDescription ?? '',
    thumbnailUrl: course.thumbnailUrl ?? '',
    visibility: course.visibility,
    categories: course.categories ?? [],
    progressEnabled: course.progressEnabled,
    areaId: course.area.id,
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

/**
 * Local-draft state for a course's settings (name/description/visibility/...), following the same
 * dirty-until-flushed shape as `useCurriculumDraft`/`useRelatedItemsDraft` - so the editor's single
 * "Salvar alteracoes" button can cover settings too, instead of settings having their own separate
 * save action. `isDirty` is a real diff against the last-saved values, not a "was anything typed"
 * flag: typing something and then undoing it back to the original goes dirty then clean again.
 */
export function useCourseSettingsDraft(course, landingDescription, courseQueryKey) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(() => ({ ...baselineFrom(course, landingDescription), password: '' }))

  // Adopt server state after a save elsewhere (e.g. the publish/unpublish toggle) or a refetch.
  useEffect(() => {
    setForm((current) => ({ ...current, ...baselineFrom(course, landingDescription) }))
  }, [course, landingDescription])

  const baseline = baselineFrom(course, landingDescription)
  const { password, ...comparable } = form
  const isDirty = !shallowEqual(comparable, baseline) || password.trim().length > 0

  const { mutateAsync, isPending: isFlushing } = useMutation({
    mutationFn: () =>
      updateCourse(course.id, {
        name: form.name.trim(),
        description: form.description,
        landingDescription: form.landingDescription,
        thumbnailUrl: form.thumbnailUrl,
        visibility: form.visibility,
        categories: form.categories,
        progressEnabled: form.progressEnabled,
        areaId: form.areaId,
        // Only send a password when one was typed: the API reads null as "keep the current one".
        password: form.password.trim() ? form.password : undefined,
      }),
    onSuccess: () => {
      setErrors({})
      setForm((current) => ({ ...current, password: '' }))
      queryClient.invalidateQueries({ queryKey: courseQueryKey })
      queryClient.invalidateQueries({ queryKey: courseKeys.all })
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
      error.draftStepLabel = 'as configuracoes do curso'
      throw error
    }
  }

  return { form, errors, isDirty, isFlushing, setField, flush }
}
