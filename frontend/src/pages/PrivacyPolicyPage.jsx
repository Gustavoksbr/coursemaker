const CONTACT_EMAIL = 'coursemakerbr@gmail.com'

/**
 * Static content page. No data fetching - this is deliberately just prose, so it stays readable
 * and reviewable as plain text instead of hiding behind a CMS.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Política de Privacidade</h1>
        <p className="text-sm text-slate-500">Última atualização: setembro de 2026</p>
      </header>

      <p className="text-slate-300">
        Esta política explica quais dados o CourseMaker coleta, para que servem, com quem são
        compartilhados e como você exerce seus direitos sob a Lei Geral de Proteção de Dados
        (Lei 13.709/2018 - LGPD).
      </p>

      <Section title="1. Quais dados coletamos">
        <p>Ao criar uma conta, guardamos o mínimo necessário para o serviço funcionar:</p>
        <ul>
          <li>Email e senha (ou, se você entrar pelo Google, apenas o email e nome que o Google confirma).</li>
          <li>Nome, nickname, foto de perfil, biografia e stacks - todos opcionais, exceto o nome e o nickname.</li>
          <li>
            O conteúdo que você publica (cursos, posts, trilhas, comentários) e o que você faz com o
            conteúdo de outras pessoas (matrículas, progresso, curtidas, itens salvos).
          </li>
        </ul>
        <p>Não pedimos CPF, telefone, endereço ou qualquer outro dado que o serviço não usa.</p>
      </Section>

      <Section title="2. Por que tratamos esses dados">
        <p>
          A base legal é a execução do contrato entre você e o CourseMaker (Art. 7º, V da LGPD): sem
          email e nome, por exemplo, não há como manter uma conta ou emitir um certificado no seu
          nome.
        </p>
      </Section>

      <Section title="3. Com quem compartilhamos dados">
        <p>Alguns serviços de terceiros processam dados em nosso nome, sempre com a finalidade específica abaixo:</p>
        <ul>
          <li>
            <strong className="text-slate-200">Supabase</strong> — hospeda nosso banco de dados: é
            onde todos os dados desta política ficam armazenados.
          </li>
          <li>
            <strong className="text-slate-200">Render</strong> — hospeda nossa API (o backend), que
            processa cada requisição que você faz ao usar o CourseMaker.
          </li>
          <li>
            <strong className="text-slate-200">Vercel</strong> — hospeda o site que você está
            usando agora (o frontend).
          </li>
          <li>
            <strong className="text-slate-200">Cloudinary</strong> — hospeda as imagens que você
            envia (fotos de perfil, thumbnails, imagens de aula).
          </li>
          <li>
            <strong className="text-slate-200">Groq</strong> — quando você usa o assistente de IA em
            um curso ou post, o conteúdo da página e a sua pergunta são enviados para gerar a
            resposta. Nada disso é enviado se você não usar o assistente.
          </li>
          <li>
            <strong className="text-slate-200">Google</strong> — apenas se você optar por entrar com
            sua conta Google, que confirma seu email e nome para nós.
          </li>
        </ul>
        <p>
          Supabase, Render e Vercel são infraestrutura: hospedam e processam os dados para o
          CourseMaker funcionar, mas não os usam para nenhuma finalidade própria. Não vendemos nem
          compartilhamos seus dados para fins de publicidade.
        </p>
      </Section>

      <Section title="4. Cookies">
        <p>
          O CourseMaker não usa cookies de rastreamento, publicidade ou analytics. O login fica
          guardado no armazenamento local do seu navegador (localStorage), usado apenas para manter
          você autenticado - nada disso é compartilhado com terceiros.
        </p>
      </Section>

      <Section title="5. Seus direitos">
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>
            <strong className="text-slate-200">Acessar e corrigir</strong> seus dados diretamente em{' '}
            <em>Editar perfil</em>.
          </li>
          <li>
            <strong className="text-slate-200">Excluir sua conta</strong> pela mesma tela, na seção
            "Zona de risco". A exclusão remove permanentemente seu email, foto, biografia e stacks.
            Cursos, posts e trilhas que você publicou continuam existindo (para não afetar quem já
            estuda por eles), mas passam a ser atribuídos a um "Usuário excluído" - sem nenhum dado
            que identifique você. Essa ação é irreversível: não há como recuperar a conta depois.
          </li>
          <li>Solicitar portabilidade ou esclarecer qualquer dúvida pelo contato abaixo.</li>
        </ul>
      </Section>

      <Section title="6. Segurança">
        <p>
          Senhas são armazenadas com hash (nunca em texto puro). Conteúdo privado exige senha
          própria para ser acessado. Comunicação com o servidor é sempre criptografada (HTTPS).
        </p>
      </Section>

      <Section title="7. Encarregado de dados (DPO) e contato">
        <p>
          Dúvidas, solicitações ou reclamações sobre seus dados podem ser enviadas para{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-400 hover:text-brand-300">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="8. Alterações nesta política">
        <p>
          Podemos atualizar esta política conforme o produto evolui. Mudanças relevantes serão
          comunicadas nesta mesma página.
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
