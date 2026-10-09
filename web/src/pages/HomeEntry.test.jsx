import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomeEntry from './HomeEntry'

const auth = vi.hoisted(() => ({ isAuthenticated: false, loading: false }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('@/pages/HomePage', () => ({ default: () => <p>pagina inicial</p> }))

function Harness({ start = '/' }) {
  return (
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/" element={<HomeEntry />} />
        <Route path="/biblioteca" element={<p>biblioteca</p>} />
        <Route path="/outra" element={<GoHome />} />
      </Routes>
    </MemoryRouter>
  )
}

function GoHome() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/')}>clicar na logo</button>
}

beforeEach(() => {
  auth.isAuthenticated = false
  auth.loading = false
})

describe('HomeEntry (a pagina "/")', () => {
  it('visitante ve a home ali mesmo, sem redirecionar', () => {
    render(<Harness />)

    expect(screen.getByText('pagina inicial')).toBeInTheDocument()
    expect(screen.queryByText('biblioteca')).toBeNull()
  })

  it('quem ja esta logado vai para a biblioteca', () => {
    auth.isAuthenticated = true
    render(<Harness />)

    expect(screen.getByText('biblioteca')).toBeInTheDocument()
    expect(screen.queryByText('pagina inicial')).toBeNull()
  })

  it('enquanto confere o token mostra o carregando, sem piscar a home', () => {
    auth.loading = true
    render(<Harness />)

    expect(screen.getByText('Carregando...')).toBeInTheDocument()
    expect(screen.queryByText('pagina inicial')).toBeNull()
  })

  it('terminada a conferencia, o logado e levado a biblioteca', () => {
    auth.loading = true
    const { rerender } = render(<Harness />)

    auth.loading = false
    auth.isAuthenticated = true
    rerender(<Harness />)

    expect(screen.getByText('biblioteca')).toBeInTheDocument()
  })

  it('terminada a conferencia, o visitante com token vencido ve a home', () => {
    auth.loading = true
    const { rerender } = render(<Harness />)

    auth.loading = false
    rerender(<Harness />)

    expect(screen.getByText('pagina inicial')).toBeInTheDocument()
  })

  it('quem entra pelo modal estando na home continua na home', () => {
    const { rerender } = render(<Harness />)
    expect(screen.getByText('pagina inicial')).toBeInTheDocument()

    auth.isAuthenticated = true // login feito pelo modal, com a pagina aberta
    rerender(<Harness />)

    expect(screen.getByText('pagina inicial')).toBeInTheDocument()
    expect(screen.queryByText('biblioteca')).toBeNull()
  })

  it('logado, voltar a "/" (clicar na logo) leva a biblioteca', async () => {
    auth.isAuthenticated = true
    render(<Harness start="/outra" />)

    screen.getByText('clicar na logo').click()

    expect(await screen.findByText('biblioteca')).toBeInTheDocument()
  })
})
