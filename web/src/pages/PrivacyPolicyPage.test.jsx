import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrivacyPolicyPage from './PrivacyPolicyPage'

describe('PrivacyPolicyPage', () => {
  it('cita o executor de codigo (Piston) entre os servicos que tratam dados', () => {
    render(<PrivacyPolicyPage />)

    expect(screen.getByText(/Executor de código \(Piston\)/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Piston' })).toHaveAttribute('href', 'https://github.com/engineer-man/piston')
    expect(screen.getByText('Resend')).toBeInTheDocument()
  })

  it('explica que o usuario pode excluir a conta e o que isso faz de verdade', () => {
    render(<PrivacyPolicyPage />)

    expect(screen.getByText('Excluir sua conta')).toBeInTheDocument()
    expect(screen.getByText(/Zona de risco/)).toBeInTheDocument()
    // the nickname is kept on published content - the text must not claim everything identifying is gone
    expect(screen.getByText(/porque faz parte do/)).toBeInTheDocument()
    expect(screen.getByText(/Matrículas, progresso, comentários, mensagens/)).toBeInTheDocument()
  })

  it('lista o que e guardado alem do perfil: codigo dos exercicios, mensagens e IP', () => {
    render(<PrivacyPolicyPage />)

    expect(screen.getByText(/O código que você escreve nos exercícios/)).toBeInTheDocument()
    expect(screen.getByText(/mensagens diretas/)).toBeInTheDocument()
    expect(screen.getByText(/endereço IP/)).toBeInTheDocument()
  })
})
