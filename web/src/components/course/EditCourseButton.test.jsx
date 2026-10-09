import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { EditCourseButton } from './EditCourseButton'

const renderButton = (props) =>
  render(
    <MemoryRouter>
      <EditCourseButton courseHref="/courses/ana/meu-curso" {...props} />
    </MemoryRouter>,
  )

describe('EditCourseButton', () => {
  it('na pagina inicial do curso abre o editor sem aula escolhida', () => {
    renderButton()

    const link = screen.getByRole('link', { name: 'Editar curso' })
    expect(link).toHaveAttribute('href', '/courses/ana/meu-curso/edit')
    expect(screen.getByText('Editar curso')).toBeInTheDocument()
  })

  it('numa aula abre o editor ja nessa aula e diz qual no tooltip', () => {
    renderButton({ lesson: { id: 'lesson-42', title: 'Funcoes' } })

    const link = screen.getByRole('link', { name: /Editar curso - abre na aula "Funcoes"/ })
    expect(link).toHaveAttribute('href', '/courses/ana/meu-curso/edit?lesson=lesson-42')
    expect(link).toHaveAttribute('title', 'Editar curso - abre na aula "Funcoes"')
  })

  it('fica fixo na tela e vira so um icone redondo em telas pequenas', () => {
    renderButton()

    const link = screen.getByRole('link', { name: 'Editar curso' })
    expect(link.className).toMatch(/\bfixed\b/)
    expect(link.className).toMatch(/\bw-10\b/)
    expect(link.className).toMatch(/sm:w-auto/)
    expect(screen.getByText('Editar curso').className).toMatch(/hidden sm:inline/)
  })
})
