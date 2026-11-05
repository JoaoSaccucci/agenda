/* =========================================================
   Agenda - copia.js
   Regras da cópia dos dados (Etapa 2a: US08, US09 e US10).

   Como o datas.js, este arquivo NÃO mexe na tela e NÃO toca no
   localStorage (quem faz isso é o armazenamento.js). Aqui as funções
   só recebem valores e devolvem respostas:
   - montar o arquivo de cópia;
   - conferir um arquivo escolhido para importar;
   - juntar duas listas de compromissos;
   - decidir se o lembrete de cópia aparece.

   Usa funções de datas.js e armazenamento.js (normalizarCompromisso),
   que são carregados antes no index.html.
   ========================================================= */

// Maior arquivo aceito na importação: 5 MB (5 x 1024 x 1024 bytes).
// Uma cópia de verdade da Agenda fica muito menor que isso.
const TAMANHO_MAXIMO_COPIA = 5 * 1024 * 1024;

// O lembrete aparece quando a última cópia tem MAIS de 30 dias,
// e o "Depois" esconde a faixa por 7 dias.
const DIAS_PARA_LEMBRAR = 30;
const DIAS_DE_ADIAMENTO = 7;

// Textos dos erros da importação (US09), num lugar só.
const ERRO_NAO_E_COPIA = "Este arquivo não é uma cópia da Agenda.";
const ERRO_VERSAO_NOVA = "Esta cópia é de uma versão mais nova da Agenda.";
const ERRO_NENHUM_VALIDO = "Nenhum compromisso válido nesta cópia.";
const ERRO_GRANDE_DEMAIS = "Arquivo grande demais para ser uma cópia da Agenda.";


/* ---------------------------------------------------------
   1. BAIXAR (US08)
   --------------------------------------------------------- */

/* Nome do arquivo: "agenda-2026-11-05.json", com a data de HOJE do
   aparelho (dataParaTexto usa o dia local, não o de Londres). */
function nomeDoArquivoDeCopia(agora) {
  return "agenda-" + dataParaTexto(agora) + ".json";
}

/* O conteúdo do arquivo (formato "Arquivo de cópia", seção 3 dos requisitos).
   JSON.stringify(valor, null, 2) = JSON com recuo de 2 espaços, fácil de
   ler num editor de texto. Os acentos saem como estão (o arquivo é UTF-8).
   Só entram os compromissos: nada de outras chaves do localStorage. */
function textoDoArquivoDeCopia(lista, agora) {
  const arquivo = {
    app: "agenda",
    versao: VERSAO_FORMATO,           // 1 na Entrega 2a (vem de armazenamento.js)
    exportadoEm: agora.toISOString(),
    compromissos: lista
  };
  return JSON.stringify(arquivo, null, 2);
}


/* ---------------------------------------------------------
   2. IMPORTAR (US09)
   --------------------------------------------------------- */

/* Confere UM item do arquivo. Usa a mesma conferência da leitura do
   localStorage (normalizarCompromisso: título, data, limites de tamanho,
   id novo se faltar), com UMA regra a mais, só da importação:
   hora fora do formato "HH:MM" faz o item ser IGNORADO (na leitura do
   localStorage ela virava "dia todo"). Hora ausente ou null = dia todo. */
function conferirItemDaCopia(item) {
  if (item !== null && typeof item === "object") {
    const semHora = item.hora === null || item.hora === undefined;
    if (!semHora && !horaValida(item.hora)) return null;
  }
  return normalizarCompromisso(item);
}

/* Milissegundos do "atualizadoEm" (para comparar qual é o mais novo).
   Sem data ou com data estranha: -Infinity, o "mais antigo possível". */
function momentoDaAtualizacao(compromisso) {
  const data = isoParaData(compromisso.atualizadoEm);
  return data === null ? -Infinity : data.getTime();
}

/* Lê o texto de um arquivo escolhido pela pessoa e confere tudo,
   SEM mudar nada na agenda.
   Devolve { erro: "texto do erro" } ou
           { compromissos: [...], ignorados: N }. */
function lerArquivoDeCopia(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch (erro) {
    return { erro: ERRO_NAO_E_COPIA };   // não é JSON
  }

  if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
    return { erro: ERRO_NAO_E_COPIA };
  }
  // "app" é opcional (dá para importar o conteúdo puro de agenda:compromissos),
  // mas, se existir, precisa ser "agenda".
  if (dados.app !== undefined && dados.app !== "agenda") {
    return { erro: ERRO_NAO_E_COPIA };
  }
  // A versão é conferida ANTES da lista: uma versão futura pode ter
  // outro formato, e a mensagem certa para ela é "versão mais nova".
  if (typeof dados.versao === "number" && dados.versao > VERSAO_FORMATO) {
    return { erro: ERRO_VERSAO_NOVA };
  }
  if (dados.versao !== VERSAO_FORMATO || !Array.isArray(dados.compromissos)) {
    return { erro: ERRO_NAO_E_COPIA };
  }

  // Confere item por item. Os com problema são contados e deixados de fora.
  // Um "mapa" (Map) guarda um item por id: se o mesmo id aparecer duas
  // vezes no arquivo, fica o de "atualizadoEm" mais recente.
  const porId = new Map();
  let ignorados = 0;
  dados.compromissos.forEach(function (item) {
    const certo = conferirItemDaCopia(item);
    if (certo === null) {
      ignorados++;
      return;
    }
    const jaVisto = porId.get(certo.id);
    if (!jaVisto || momentoDaAtualizacao(certo) > momentoDaAtualizacao(jaVisto)) {
      porId.set(certo.id, certo);
    }
  });

  if (porId.size === 0) return { erro: ERRO_NENHUM_VALIDO };

  // Array.from(mapa.values()) = a lista dos itens, na ordem do arquivo.
  return { compromissos: Array.from(porId.values()), ignorados: ignorados };
}


/* "Juntar" (US09): acrescenta os da cópia e mantém os daqui.
   - id novo: o item é acrescentado (conta como "novo");
   - id que já existe: fica a versão de "atualizadoEm" mais recente
     (se for a da cópia, conta como "atualizado"; empate: fica a daqui).
   Nada que já existia é apagado. Devolve a lista nova e as contagens,
   sem mexer na lista "atuais" (ela só é trocada se a gravação der certo). */
function juntarCompromissos(atuais, daCopia) {
  const lista = atuais.slice();   // cópia da lista, para não mexer na original
  let novos = 0;
  let atualizados = 0;

  daCopia.forEach(function (item) {
    const posicao = lista.findIndex(function (c) { return c.id === item.id; });
    if (posicao === -1) {
      lista.push(item);
      novos++;
    } else if (momentoDaAtualizacao(item) > momentoDaAtualizacao(lista[posicao])) {
      lista[posicao] = item;
      atualizados++;
    }
  });

  return { lista: lista, novos: novos, atualizados: atualizados };
}


/* ---------------------------------------------------------
   3. LEMBRETE DE CÓPIA (US10)
   --------------------------------------------------------- */

/* Decide se a faixa de lembrete aparece ao abrir a página.
   Recebe os textos ISO guardados (ou null) e a hora atual.
   Devolve null (não aparece) ou { diasDesdeACopia: N } (N = null
   quando nunca houve cópia).

   As DUAS condições precisam valer:
   1. a última cópia tem mais de 30 dias (sem cópia: conta a partir do
      compromisso mais antigo, pelo criadoEm);
   2. houve mudança depois da última cópia (sem cópia: basta existir
      compromisso). */
function avaliarLembrete(lista, textoUltimoBackup, textoUltimaMudanca, textoAdiadoAte, agora) {
  if (lista.length === 0) return null;

  // "Depois" foi usado e os 7 dias ainda não passaram.
  const adiadoAte = isoParaData(textoAdiadoAte);
  if (adiadoAte !== null && agora < adiadoAte) return null;

  const hoje = dataParaTexto(agora);
  const ultimoBackup = isoParaData(textoUltimoBackup);

  if (ultimoBackup !== null) {
    // Dias de calendário desde a cópia (como o "daqui a X dias").
    const dias = diasEntre(dataParaTexto(ultimoBackup), hoje);
    const ultimaMudanca = isoParaData(textoUltimaMudanca);
    const mudouDepois = ultimaMudanca !== null && ultimaMudanca > ultimoBackup;
    return dias > DIAS_PARA_LEMBRAR && mudouDepois ? { diasDesdeACopia: dias } : null;
  }

  // Nunca houve cópia: procura o compromisso criado há mais tempo.
  let maisAntigo = null;
  lista.forEach(function (compromisso) {
    const criado = isoParaData(compromisso.criadoEm);
    if (criado !== null && (maisAntigo === null || criado < maisAntigo)) maisAntigo = criado;
  });
  // Sem nenhum criadoEm válido não dá para contar os dias: a faixa não aparece.
  if (maisAntigo === null) return null;

  const dias = diasEntre(dataParaTexto(maisAntigo), hoje);
  return dias > DIAS_PARA_LEMBRAR ? { diasDesdeACopia: null } : null;
}


/* Até quando o "Depois" esconde a faixa: agora + 7 dias. */
function fimDoAdiamento(agora) {
  const fim = new Date(agora);
  fim.setDate(fim.getDate() + DIAS_DE_ADIAMENTO);
  return fim;
}


/* ---------------------------------------------------------
   4. TEXTOS COM NÚMERO (singular, plural e zero)
   Tabela da seção 12.5 do design.
   --------------------------------------------------------- */

/* 1 -> "1 compromisso"; 12 -> "12 compromissos". */
function quantosCompromissos(numero) {
  return numero + (numero === 1 ? " compromisso" : " compromissos");
}

function textoIgnorados(numero) {
  return numero === 1
    ? "1 item com problema foi ignorado."
    : numero + " itens com problema foram ignorados.";
}

function textoNesteNavegador(numero) {
  if (numero === 0) return "Neste navegador não há compromissos.";
  return "Neste navegador há " + quantosCompromissos(numero) + ".";
}

/* "pelos 12 da cópia" / "pelo compromisso da cópia" (1). */
function pelosDaCopia(numero) {
  return numero === 1 ? "pelo compromisso da cópia" : "pelos " + numero + " da cópia";
}

/* Explicação embaixo do botão "Substituir tudo". */
function textoExplicaSubstituir(atuais, daCopia) {
  if (atuais === 0) {
    // [Interpretação do dev] Os requisitos não trazem o texto para zero:
    // "Troca os 0 compromissos daqui" ficaria estranho.
    return daCopia === 1
      ? "Neste navegador fica só o compromisso da cópia."
      : "Neste navegador ficam só os " + daCopia + " compromissos da cópia.";
  }
  const daqui = atuais === 1 ? "o compromisso daqui" : "os " + atuais + " compromissos daqui";
  return "Troca " + daqui + " " + pelosDaCopia(daCopia) + ".";
}

/* Texto da confirmação "Substituir tudo?" (só aparece com 1 ou mais atuais). */
function textoConfirmaSubstituir(atuais, daCopia) {
  const inicio = atuais === 1
    ? "O compromisso atual será trocado "
    : "Os " + atuais + " compromissos atuais serão trocados ";
  return inicio + pelosDaCopia(daCopia) + ". Essa ação não pode ser desfeita.";
}

/* Resultado do "Juntar": "Cópia importada: 5 novos e 2 atualizados."
   A parte que for zero não aparece; com as duas em zero, nada mudou. */
function textoResultadoJuntar(novos, atualizados) {
  const partes = [];
  if (novos > 0) partes.push(novos + (novos === 1 ? " novo" : " novos"));
  if (atualizados > 0) partes.push(atualizados + (atualizados === 1 ? " atualizado" : " atualizados"));
  if (partes.length === 0) return "Cópia importada: nada mudou, você já tinha esses compromissos.";
  return "Cópia importada: " + partes.join(" e ") + ".";
}

/* Resultado do "Substituir": "Cópia importada: 12 compromissos." */
function textoResultadoSubstituir(total) {
  return "Cópia importada: " + quantosCompromissos(total) + ".";
}
