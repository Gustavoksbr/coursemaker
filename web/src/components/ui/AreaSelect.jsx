import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@/components/ui/Field'
import { areaKeys, listAreas } from '@/api/areas'

/**
 * A plain `<Select>` populated from the admin-curated area list. Pre-selects the first area once
 * loaded when nothing is chosen yet, so the field never sits on an empty, blocking-required value.
 */
export function AreaSelect({ id, value, onChange }) {
  const { data: areas, isPending } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })

  useEffect(() => {
    if (!value && areas?.length) onChange(areas[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas])

  if (isPending) {
    return (
      <Select id={id} disabled>
        <option>Carregando areas...</option>
      </Select>
    )
  }

  return (
    <Select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      {!areas?.length && <option value="">Nenhuma area disponivel</option>}
      {areas?.map((area) => (
        <option key={area.id} value={area.id}>
          {area.name}
        </option>
      ))}
    </Select>
  )
}
