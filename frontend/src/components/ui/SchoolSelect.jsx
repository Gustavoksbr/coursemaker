import { useQuery } from '@tanstack/react-query'
import { Field, Select } from '@/components/ui/Field'
import { listMySchools, schoolKeys } from '@/api/schools'

/**
 * School, unlike area, is optional and permissioned: only an admin can grant a user the right to
 * publish under one (see SchoolService). So this field self-hides entirely - own `<Field>` wrapper
 * included - when the logged-in user has not been granted any school; there is nothing to pick.
 * Always offers "Sem escola" alongside whatever the user is a member of, so an existing
 * attribution can be cleared without picking a replacement.
 */
export function SchoolSelect({ id, value, onChange }) {
  const { data: schools, isPending } = useQuery({ queryKey: schoolKeys.mine(), queryFn: listMySchools })

  if (isPending || !schools?.length) return null

  return (
    <Field
      label="Escola"
      htmlFor={id}
      hint="De onde este conteudo veio, se de algum lugar. Aparece como credito, nao como parceria oficial."
    >
      <Select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Sem escola</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </Select>
    </Field>
  )
}
