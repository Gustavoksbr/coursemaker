import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SidebarDrawer } from './SidebarDrawer'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Aulas</button>
      <SidebarDrawer open={open} onClose={() => setOpen(false)}>
        <p>Primeira aula</p>
      </SidebarDrawer>
    </>
  )
}

describe('SidebarDrawer', () => {
  it('nao renderiza nada fechada', () => {
    render(<SidebarDrawer open={false} onClose={() => {}}><p>conteudo</p></SidebarDrawer>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('abre com o conteudo, trava a rolagem e devolve o foco ao fechar com Escape', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Aulas' })
    await user.click(opener)

    expect(screen.getByRole('dialog', { name: 'Conteudo do curso' })).toBeTruthy()
    expect(screen.getByText('Primeira aula')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(document.activeElement).toBe(opener)
  })

  it('fecha pelo botao e ao tocar no fundo', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Aulas' }))
    await user.click(screen.getByRole('button', { name: 'Fechar menu' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Aulas' }))
    const backdrop = document.querySelector('[aria-hidden="true"].absolute')
    await user.click(backdrop)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
