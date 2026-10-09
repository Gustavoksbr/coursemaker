import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BlockEditor } from './BlockEditor'
import { TranscriptField } from './TranscriptField'

const video = { id: 'b1', type: 'video', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', language: undefined }

describe('TranscriptField', () => {
  it('avisa que so o assistente usa o texto e que um resumo serve', () => {
    render(<TranscriptField blockId="b1" value="" onChange={() => {}} />)

    expect(screen.getByText(/so para o assistente de IA/)).toBeInTheDocument()
    expect(screen.getByText(/Os alunos nao veem este texto/)).toBeInTheDocument()
    expect(screen.getByText(/uma explicacao ou um resumo dele/)).toBeInTheDocument()
    expect(screen.queryByText(/Mostrar transcricao/)).toBeNull()
    expect(screen.queryByText(/adicionada/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Remover texto/ })).toBeNull()
  })

  it('mostra que ja ha transcricao e quantos caracteres', () => {
    render(<TranscriptField blockId="b1" value={'0:00\nola mundo'} onChange={() => {}} />)

    expect(screen.getByText(/adicionada \(14 caracteres\)/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remover texto/ })).toBeInTheDocument()
  })

  it('repassa o que e colado e permite remover', async () => {
    const onChange = vi.fn()
    render(<TranscriptField blockId="b1" value="texto" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Transcricao ou resumo do video'), { target: { value: '0:05\nnovo texto' } })
    expect(onChange).toHaveBeenLastCalledWith('0:05\nnovo texto')

    await userEvent.setup().click(screen.getByRole('button', { name: /Remover texto/ }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})

describe('BlockEditor - transcricao', () => {
  it('aparece so em blocos de video e grava no rascunho como { transcript }', () => {
    const onChange = vi.fn()
    const { rerender } = render(<BlockEditor block={video} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Transcricao ou resumo do video'), { target: { value: 'fala do professor' } })
    expect(onChange).toHaveBeenCalledWith({ transcript: 'fala do professor' })

    rerender(<BlockEditor block={{ id: 'b2', type: 'code', content: 'x = 1', language: 'python' }} onChange={onChange} />)
    expect(screen.queryByLabelText('Transcricao ou resumo do video')).toBeNull()
  })

  it('um bloco de video vindo do servidor sem transcricao abre vazio', () => {
    render(<BlockEditor block={video} onChange={() => {}} />)

    expect(screen.getByLabelText('Transcricao ou resumo do video')).toHaveValue('')
  })
})
