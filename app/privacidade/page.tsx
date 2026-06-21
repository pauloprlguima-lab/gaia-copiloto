export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px", lineHeight: 1.65 }}>
      <p style={{ fontWeight: 700 }}>Método GAIA</p>
      <h1>Política de privacidade do GAIA Radar e Funil</h1>

      <p>
        A Ação GAIA Radar consulta dados cadastrais públicos de empresas brasileiras a partir do
        CNPJ informado pelo usuário. A finalidade é apoiar pesquisa e preparação comercial.
      </p>

      <h2>Dados utilizados</h2>
      <p>
        A consulta pode retornar razão social, nome fantasia, situação cadastral, atividades,
        endereço empresarial, canais oficiais declarados e quadro societário público. A ferramenta
        não solicita CPF, credenciais bancárias, documentos financeiros ou telefone pessoal.
      </p>

      <h2>Fonte e tratamento</h2>
      <p>
        Os dados são obtidos de fonte cadastral pública identificada na própria resposta. O Método
        GAIA normaliza os campos para facilitar a leitura e não transforma capital social em
        faturamento, limite de crédito ou capacidade de pagamento.
      </p>

      <h2>Retenção e compartilhamento</h2>
      <p>
        Uma consulta isolada de CNPJ não é incluída automaticamente no Funil. Quando o usuário pede
        para salvar uma empresa, o Funil mantém nome empresarial, CNPJ, etapa comercial, próxima
        ação, observações e o dossiê público associado em armazenamento privado protegido. Esses
        registros podem ser alterados ou excluídos pelo usuário e não são vendidos a terceiros.
      </p>

      <h2>Segurança do Funil</h2>
      <p>
        O acesso pelo aplicativo exige PIN privado e o acesso pelo GPT utiliza chave exclusiva da
        Ação. Não devem ser armazenados no Funil documentos bancários, balanços, contratos, carteira
        de recebíveis, CPF, credenciais ou outros dados financeiros sensíveis.
      </p>

      <h2>Uso responsável</h2>
      <p>
        Telefones e e-mails retornados devem ser confirmados antes do contato e usados de acordo com
        a LGPD e as regras aplicáveis à comunicação comercial. A ferramenta não fornece parecer
        jurídico nem decisão de crédito.
      </p>

      <p>Última atualização: 20 de junho de 2026.</p>
    </main>
  );
}
