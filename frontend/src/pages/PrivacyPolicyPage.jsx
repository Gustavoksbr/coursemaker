const CONTACT_EMAIL = 'coursemakerbr@gmail.com'

/**
 * Static content page. No data fetching - this is deliberately just prose, so it stays readable
 * and reviewable as plain text instead of hiding behind a CMS.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Politica de Privacidade</h1>
        <p className="text-sm text-slate-500">Ultima atualizacao: setembro de 2026</p>
      </header>

      <p className="text-slate-300">
        Esta politica explica quais dados o CourseMaker coleta, para que servem, com quem sao
        compartilhados e como voce exerce seus direitos sob a Lei Geral de Protecao de Dados
        (Lei 13.709/2018 - LGPD).
      </p>

      <Section title="1. Quais dados coletamos">
        <p>Ao criar uma conta, guardamos o minimo necessario para o servico funcionar:</p>
        <ul>
          <li>Email e senha (ou, se voce entrar pelo Google, apenas o email e nome que o Google confirma).</li>
          <li>Nome, nickname, foto de perfil, biografia e stacks - todos opcionais, exceto o nome e o nickname.</li>
          <li>
            O conteudo que voce publica (cursos, posts, trilhas, comentarios) e o que voce faz com o
            conteudo de outras pessoas (matriculas, progresso, curtidas, itens salvos).
          </li>
        </ul>
        <p>Nao pedimos CPF, telefone, endereco ou qualquer outro dado que o servico nao usa.</p>
      </Section>

      <Section title="2. Por que tratamos esses dados">
        <p>
          A base legal e a execucao do contrato entre voce e o CourseMaker (Art. 7º, V da LGPD): sem
          email e nome, por exemplo, nao ha como manter uma conta ou emitir um certificado no seu
          nome.
        </p>
      </Section>

      <Section title="3. Com quem compartilhamos dados">
        <p>Alguns serviços de terceiros processam dados em nosso nome, sempre com a finalidade especifica abaixo:</p>
        <ul>
          <li>
            <strong className="text-slate-200">Cloudinary</strong> — hospeda as imagens que voce
            envia (fotos de perfil, thumbnails, imagens de aula).
          </li>
          <li>
            <strong className="text-slate-200">Groq</strong> — quando voce usa o assistente de IA em
            um curso ou post, o conteudo da pagina e a sua pergunta sao enviados para gerar a
            resposta. Nada disso e enviado se voce nao usar o assistente.
          </li>
          <li>
            <strong className="text-slate-200">Google</strong> — apenas se voce optar por entrar com
            sua conta Google, que confirma seu email e nome para nos.
          </li>
        </ul>
        <p>Nao vendemos nem compartilhamos seus dados para fins de publicidade.</p>
      </Section>

      <Section title="4. Cookies">
        <p>
          O CourseMaker nao usa cookies de rastreamento, publicidade ou analytics. O login fica
          guardado no armazenamento local do seu navegador (localStorage), usado apenas para manter
          voce autenticado - nada disso e compartilhado com terceiros.
        </p>
      </Section>

      <Section title="5. Seus direitos">
        <p>Voce pode, a qualquer momento:</p>
        <ul>
          <li>
            <strong className="text-slate-200">Acessar e corrigir</strong> seus dados diretamente em{' '}
            <em>Editar perfil</em>.
          </li>
          <li>
            <strong className="text-slate-200">Excluir sua conta</strong> pela mesma tela, na secao
            "Zona de risco". A exclusao remove permanentemente seu email, foto, biografia e stacks.
            Cursos, posts e trilhas que voce publicou continuam existindo (para nao afetar quem ja
            estuda por eles), mas passam a ser atribuidos a um "Usuario excluido" - sem nenhum dado
            que identifique voce. Essa acao e irreversivel: nao ha como recuperar a conta depois.
          </li>
          <li>Solicitar portabilidade ou esclarecer qualquer duvida pelo contato abaixo.</li>
        </ul>
      </Section>

      <Section title="6. Seguranca">
        <p>
          Senhas sao armazenadas com hash (nunca em texto puro). Conteudo privado exige senha
          propria para ser acessado. Comunicacao com o servidor e sempre criptografada (HTTPS).
        </p>
      </Section>

      <Section title="7. Encarregado de dados (DPO) e contato">
        <p>
          Duvidas, solicitacoes ou reclamacoes sobre seus dados podem ser enviadas para{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-400 hover:text-brand-300">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="8. Alteracoes nesta politica">
        <p>
          Podemos atualizar esta politica conforme o produto evolui. Mudancas relevantes serao
          comunicadas nesta mesma pagina.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  )
}
