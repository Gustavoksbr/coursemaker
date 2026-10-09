import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatAboutCourse, chatAboutPost } from '@/api/ai'
import { ChatWidget, chatContext } from './ChatWidget'

vi.mock('@/api/ai', () => ({
  chatAboutCourse: vi.fn(),
  chatAboutPost: vi.fn(),
}))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))

const lessonA = { id: 'lesson-a', title: 'Estruturas de Repeticao 1' }
const lessonB = { id: 'lesson-b', title: 'Funcoes' }

function openChat() {
  // The bubble is a draggable handle (pointer events); a plain click is what a tap becomes.
  fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }))
}

async function ask(text) {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText(/Pergunte algo/), `${text}{Enter}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  chatAboutCourse.mockResolvedValue({ reply: 'resposta' })
  chatAboutPost.mockResolvedValue({ reply: 'resposta' })
})

describe('chatContext', () => {
  it('descreve a aula aberta, a visao geral sem aula e o post', () => {
    expect(chatContext('course', lessonA)).toMatchObject({ key: 'lesson-a', label: 'Estruturas de Repeticao 1' })
    expect(chatContext('course', null)).toMatchObject({ key: null, label: 'Visao geral do curso', muted: true })
    expect(chatContext('post', null)).toMatchObject({ key: 'post', label: 'Este post' })
  })
})

describe('ChatWidget - contexto do assistente', () => {
  it('mostra a aula aberta como etiqueta e avisa que so ve essa aula', () => {
    render(<ChatWidget kind="course" contentId="course-1" lesson={lessonA} />)
    openChat()

    const tag = screen.getByTestId('chat-context')
    expect(tag).toHaveTextContent('Estruturas de Repeticao 1')
    expect(tag).toHaveTextContent('Vejo so o conteudo desta aula')
    expect(screen.getByRole('button', { name: /Resuma esta aula/ })).toBeInTheDocument()
  })

  it('sem aula aberta mostra a visao geral e sugestoes sobre o curso', () => {
    render(<ChatWidget kind="course" contentId="course-1" lesson={null} />)
    openChat()

    expect(screen.getByTestId('chat-context')).toHaveTextContent('Visao geral do curso')
    expect(screen.getByTestId('chat-context')).toHaveTextContent('so conheco os titulos')
    expect(screen.getByRole('button', { name: /Quais aulas tem este curso/ })).toBeInTheDocument()
  })

  it('envia o id da aula aberta junto da pergunta', async () => {
    render(<ChatWidget kind="course" contentId="course-1" lesson={lessonA} />)
    openChat()
    await ask('o que e um laco?')

    await waitFor(() => expect(chatAboutCourse).toHaveBeenCalledTimes(1))
    expect(chatAboutCourse).toHaveBeenCalledWith('course-1', {
      message: 'o que e um laco?',
      history: [],
      lessonId: 'lesson-a',
    })
  })

  it('sem aula aberta envia lessonId nulo', async () => {
    render(<ChatWidget kind="course" contentId="course-1" lesson={null} />)
    openChat()
    await ask('por onde comeco?')

    await waitFor(() => expect(chatAboutCourse).toHaveBeenCalled())
    expect(chatAboutCourse.mock.calls[0][1].lessonId).toBeNull()
  })

  it('marca na conversa o ponto em que o aluno abriu outra aula', async () => {
    const { rerender } = render(<ChatWidget kind="course" contentId="course-1" lesson={lessonA} />)
    openChat()
    await ask('primeira pergunta')
    await screen.findByText('resposta')
    expect(screen.queryByText(/Agora sobre:/)).toBeNull()

    rerender(<ChatWidget kind="course" contentId="course-1" lesson={lessonB} />)
    expect(screen.getByTestId('chat-context')).toHaveTextContent('Funcoes')
    await ask('segunda pergunta')

    expect(await screen.findByText('Agora sobre: Funcoes')).toBeInTheDocument()
    expect(chatAboutCourse.mock.calls[1][1]).toMatchObject({ lessonId: 'lesson-b' })
    // the earlier question keeps being sent as history
    expect(chatAboutCourse.mock.calls[1][1].history).toHaveLength(2)
  })

  it('no post mostra "Este post" e nao envia lessonId', async () => {
    render(<ChatWidget kind="post" contentId="post-1" />)
    openChat()
    expect(screen.getByTestId('chat-context')).toHaveTextContent('Este post')

    await ask('resuma')
    await waitFor(() => expect(chatAboutPost).toHaveBeenCalled())
    expect(chatAboutPost.mock.calls[0][1]).toEqual({ message: 'resuma', history: [] })
  })
})
