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
        <p className="text-sm text-slate-500">Última atualização: outubro de 2026</p>
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
          <li>
            O código que você escreve nos exercícios de código: a última versão enviada em cada
            exercício fica salva, para você continuar de onde parou, junto com o resultado dos testes.
          </li>
          <li>As mensagens diretas que você troca com outras pessoas na plataforma.</li>
          <li>
            O seu endereço IP e o email usados nas tentativas de login, cadastro e recuperação de
            senha. Servem apenas para limitar tentativas em excesso e proteger as contas contra abuso.
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
            <strong className="text-slate-200">Executor de código (Piston)</strong> — quando você roda
            ou envia o código de um exercício, ele é enviado ao nosso executor de código, um serviço
            do próprio CourseMaker, hospedado na Render e baseado no{' '}
            <a
              href="https://github.com/engineer-man/piston"
              target="_blank"
              rel="noreferrer"
              className="text-brand-400 hover:text-brand-300"
            >
              Piston
            </a>
            , um projeto de código aberto. Ele executa o programa em um ambiente isolado e devolve
            apenas a saída e o resultado dos testes. Nada é enviado se você não rodar um exercício.
          </li>
          <li>
            <strong className="text-slate-200">Resend</strong> — envia o email de recuperação de
            senha, quando você pede. Recebe o seu email e o link de redefinição.
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
          Supabase, Render, Vercel, Resend e o executor de código são infraestrutura: hospedam e
          processam os dados para o CourseMaker funcionar, mas não os usam para nenhuma finalidade própria. Não vendemos nem
          compartilhamos seus dados para fins de publicidade.
        </p>
      </Section>

      <Section title="4. Cookies">
        <p>
          O CourseMaker não usa cookies de rastreamento, publicidade ou analytics. O login fica
          guardado no armazenamento local do seu navegador (localStorage), usado apenas para manter
          você autenticado - nada disso é compartilhado com terceiros.
        </p>
        <p>
          Os vídeos das aulas são incorporados do YouTube ou do Google Drive. Quando você os
          reproduz, esses serviços podem definir os próprios cookies; isso acontece nos servidores
          deles e não é controlado pelo CourseMaker.
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
            "Zona de risco". A exclusão remove permanentemente seu email, nome, senha, foto,
            biografia e stacks, e a conta passa a aparecer como "Usuário excluído". Essa ação é
            irreversível: não há como recuperar a conta depois.
            <ul>
              <li>
                Cursos, posts e trilhas que você publicou continuam existindo, para não afetar quem
                já estuda por eles. O seu <em>nickname</em> permanece neles, porque faz parte do
                endereço desses conteúdos.
              </li>
              <li>
                Matrículas, progresso, comentários, mensagens e o código dos exercícios não são
                apagados, mas ficam ligados a uma conta que já não tem email, nome nem foto. Para
                pedir a remoção de algum conteúdo específico, escreva para o contato abaixo.
              </li>
            </ul>
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
