/* =========================================================
   Agenda - app.js
   A parte que conversa com a tela: monta a lista por dia,
   abre o formulário, salva, edita, exclui e mostra avisos.

   Usa as funções de datas.js, armazenamento.js e copia.js,
   que são carregados antes deste arquivo no index.html.
   Etapa 2a: janela "Seus dados" (baixar e importar cópia)
   e faixa de lembrete de cópia (seções 10 a 12).
   Etapa 2b: "Ficou pendente", "Sem data", "Sair às...", Feito,
   Desfazer, "Não vou fazer", Remarcar e Agendar (seções 5, 8 e 9b).
   Etapa 3a: hora de fim, aviso de conflito e de aperto, e o
   checklist "O que levar" no card e no formulário (seções 5, 8b e 9c).

   Regra de segurança (US01): tudo o que a pessoa digita entra
   na página com textContent, NUNCA com innerHTML. Assim um
   título "<b>oi</b>" aparece como texto, com os sinais < e >.
   ========================================================= */


/* ---------------------------------------------------------
   1. ESTADO (o que o programa "lembra" enquanto a página está aberta)
   --------------------------------------------------------- */

// A lista de compromissos, na memória. É ela que vai para o localStorage.
let compromissos = [];

// id do compromisso que está sendo editado (null = criando um novo).
let idEmEdicao = null;

// Etapa 2b: com que "cara" o formulário abriu:
// "novo", "editar", "remarcar" (US15) ou "agendar" (US16).
let modoDoFormulario = "novo";

// id do compromisso que a confirmação de exclusão vai apagar.
let idParaExcluir = null;

// O botão que abriu a janela: o foco volta para ele quando a janela fecha.
let botaoQueAbriu = null;

// O que fazer com o foco quando a janela fechar depois de Salvar ou Excluir.
// null = voltar para o botão que abriu.
let focoDepoisDeFechar = null;

// "Resumo" da última lista desenhada. A cada minuto comparamos com um
// resumo novo: se nada mudou, não redesenhamos (e não atrapalhamos quem
// está lendo a lista com leitor de tela).
let resumoDaTela = "";

// Relógio que esconde o aviso flutuante depois de alguns segundos.
let relogioDoStatus = null;

// Etapa 2a: data (Date) da última cópia baixada, ou null se nunca houve.
// Fica também na memória: se o localStorage não puder guardar a data,
// a janela "Seus dados" ainda mostra a cópia que acabou de ser feita.
let ultimoBackup = null;

// Etapa 2a: o arquivo já conferido que espera a escolha "Juntar" ou
// "Substituir tudo": { compromissos: [...], ignorados: N }.
let copiaParaImportar = null;

// Etapa 3a (US17): os itens do checklist enquanto o formulário está aberto.
// Só vão para o compromisso ao Salvar; Cancelar ou Esc descartam.
let itensDoFormulario = [];

// Etapa 3a (US18): ids dos compromissos com a lista "O que levar" aberta
// no card. Um Set é uma lista sem repetidos. A lista começa fechada ao
// abrir a página e continua aberta quando a tela é redesenhada.
const checklistsAbertos = new Set();

// Etapa 3a (US20): avisos de conflito e de aperto da lista que está
// sendo desenhada, por id do compromisso ("Map" = tabela id -> aviso).
let avisosDeHorario = new Map();


/* ---------------------------------------------------------
   2. ELEMENTOS DA PÁGINA
   --------------------------------------------------------- */
const botaoNovo = document.getElementById("botao-novo");
const areaPrincipal = document.querySelector(".principal");
const faixas = document.getElementById("faixas");
const listaProximos = document.getElementById("lista-proximos");
const secaoAnteriores = document.getElementById("secao-anteriores");
const botaoAnteriores = document.getElementById("botao-anteriores");
const contagemAnteriores = document.getElementById("contagem-anteriores");
const listaAnteriores = document.getElementById("lista-anteriores");
const avisoStatus = document.getElementById("status");

// Etapa 2b: "Ficou pendente" e "Sem data"
const secaoPendentes = document.getElementById("secao-pendentes");
const contagemPendentes = document.getElementById("contagem-pendentes");
const listaPendentes = document.getElementById("lista-pendentes");
const secaoSemData = document.getElementById("secao-sem-data");
const botaoSemData = document.getElementById("botao-sem-data");
const contagemSemData = document.getElementById("contagem-sem-data");
const listaSemData = document.getElementById("lista-sem-data");

const janelaCompromisso = document.getElementById("janela-compromisso");
const formulario = document.getElementById("form-compromisso");
const tituloDaJanela = document.getElementById("janela-titulo");
const campoTitulo = document.getElementById("campo-titulo");
const campoData = document.getElementById("campo-data");
const campoHora = document.getElementById("campo-hora");
const campoLocal = document.getElementById("campo-local");
const campoObs = document.getElementById("campo-obs");
const erroTitulo = document.getElementById("erro-titulo");
const erroData = document.getElementById("erro-data");
const erroSalvar = document.getElementById("erro-salvar");

// Etapa 2b: campos novos do formulário
const subtituloDaJanela = document.getElementById("janela-subtitulo");
const valorDoSubtitulo = document.getElementById("janela-subtitulo-valor");
const dataObrigatorio = document.getElementById("data-obrigatorio");
const campoSemData = document.getElementById("campo-sem-data");
const grupoSair = document.getElementById("grupo-sair");
const dicaSair = document.getElementById("dica-sair");
const opcoesDeSaida = grupoSair.querySelectorAll('input[name="antecedencia"]');
const blocoMinutos = document.getElementById("bloco-minutos");
const campoMinutos = document.getElementById("campo-minutos");
const erroMinutos = document.getElementById("erro-minutos");
const campoCobrar = document.getElementById("campo-cobrar");

// Etapa 3a: "Hora de fim" (US19) e "O que levar" (US17)
const grupoFim = document.getElementById("grupo-fim");
const dicaFim = document.getElementById("dica-fim");
const dicaFimSemHora = document.getElementById("dica-fim-sem-hora");
const campoFim = document.getElementById("campo-fim");
const erroFim = document.getElementById("erro-fim");
const campoDuracao = document.getElementById("campo-duracao");
const erroDuracao = document.getElementById("erro-duracao");
const blocoDuracaoMin = document.getElementById("bloco-duracao-min");
const campoDuracaoMin = document.getElementById("campo-duracao-min");
const erroDuracaoMin = document.getElementById("erro-duracao-min");
const listaItensForm = document.getElementById("itens-lista");
const campoNovoItem = document.getElementById("campo-novo-item");
const botaoAdicionar = document.getElementById("botao-adicionar");
const dicaItensLimite = document.getElementById("dica-itens-limite");
const avisoItens = document.getElementById("itens-aviso");

const janelaExcluir = document.getElementById("janela-excluir");
const tituloExcluir = document.getElementById("excluir-titulo");

// Etapa 2a: "Seus dados", importação e lembrete de cópia
const tituloProximos = document.getElementById("titulo-proximos");
const botaoDados = document.getElementById("botao-dados");
const janelaDados = document.getElementById("janela-dados");
const placaComData = document.getElementById("dados-placa-data");
const placaValor = document.getElementById("dados-ultima-valor");
const placaNunca = document.getElementById("dados-placa-nunca");
const botaoBaixar = document.getElementById("botao-baixar");
const botaoImportar = document.getElementById("botao-importar");
const campoArquivo = document.getElementById("arquivo-importar");
const avisoDados = document.getElementById("dados-aviso");

const janelaImportar = document.getElementById("janela-importar");
const resumoImportar = document.getElementById("importar-resumo");
const botaoJuntar = janelaImportar.querySelector('[data-acao="juntar"]');
const botaoSubstituirTudo = janelaImportar.querySelector('[data-acao="substituir"]');
const textoOpcaoSubstituir = document.getElementById("opcao-substituir-texto");

const janelaSubstituir = document.getElementById("janela-substituir");
const textoSubstituir = document.getElementById("substituir-texto");


/* ---------------------------------------------------------
   3. ÍCONES
   Só o "miolo" de cada SVG (design, seção 8.2). São textos FIXOS
   escritos por nós, por isso podem entrar como HTML com segurança.
   --------------------------------------------------------- */
const ICONES = {
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  excluir: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
  local: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  // Etapa 2a (design, seção 12.8)
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  baixar: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  historico: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  // Etapa 2b (design, seção 13.10). O nome é o mesmo do data-acao do botão.
  feito: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  desfazer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  remarcar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M9 15.5h6.5M13.5 13l2.5 2.5-2.5 2.5"/>',
  "nao-vou-fazer": '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  agendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12 13v5M9.5 15.5h5"/>',
  sair: '<path d="M13 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7"/><path d="M15 8l4 4-4 4M19 12H10"/>',
  cobrar: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  passou: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  // Etapa 3a (design, seção 14.8). "seta" é a mesma de "Anteriores".
  mala: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18"/>',
  conflito: '<rect x="3" y="4" width="12" height="10" rx="2"/><rect x="9" y="10" width="12" height="10" rx="2"/>',
  aperto: '<path d="M6 3h12M6 21h12"/><path d="M7 3v2a5 5 0 0 0 10 0V3M7 21v-2a5 5 0 0 1 10 0v2"/>',
  remover: '<path d="M6 6l12 12M18 6L6 18"/>',
  seta: '<path d="M6 9l6 6 6-6"/>'
};

// Ilustração da lista vazia (design, seção 8.3). Também é texto fixo.
const ILUSTRACAO_VAZIO =
  '<svg class="vazio-ilustracao" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112" width="160" height="112" fill="none" aria-hidden="true" focusable="false">' +
  '<circle cx="130" cy="20" r="11" fill="#FFB547"/>' +
  '<circle cx="136" cy="15" r="10" fill="#191321"/>' +
  '<circle cx="108" cy="12" r="1.5" fill="#F5EEE6" opacity=".6"/>' +
  '<circle cx="150" cy="38" r="1.2" fill="#F5EEE6" opacity=".5"/>' +
  '<rect x="12" y="34" width="136" height="68" rx="10" fill="#0F0B14" stroke="#3A2F48" stroke-width="2"/>' +
  '<rect x="24" y="46" width="36" height="18" rx="3" fill="#231A2E"/>' +
  '<path d="M24 55h36" stroke="#0F0B14"/>' +
  '<path d="M33 55h18" stroke="#FFB547" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>' +
  '<rect x="68" y="51" width="66" height="8" rx="4" fill="#3A2F48"/>' +
  '<rect x="24" y="72" width="36" height="18" rx="3" fill="#231A2E"/>' +
  '<path d="M24 81h36" stroke="#0F0B14"/>' +
  '<path d="M33 81h18" stroke="#C4A8FF" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>' +
  '<rect x="68" y="77" width="44" height="8" rx="4" fill="#3A2F48"/>' +
  '</svg>';


/* Transforma um texto de SVG fixo em elemento. O <template> é um
   "rascunho" do HTML: monta os elementos sem mostrar nada na tela. */
function criarDeHtmlFixo(html) {
  const molde = document.createElement("template");
  molde.innerHTML = html;
  return molde.content.firstElementChild;
}

/* classeExtra (opcional): mais uma classe no <svg> (ex.: "checklist-seta"). */
function criarIcone(nome, classeExtra) {
  return criarDeHtmlFixo(
    '<svg class="icone' + (classeExtra ? " " + classeExtra : "") + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    ICONES[nome] + "</svg>"
  );
}


/* Atalho para criar um elemento com classe e texto.
   O texto entra com textContent: é seguro para o que a pessoa digitou. */
function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined && texto !== null) elemento.textContent = texto;
  return elemento;
}


/* ---------------------------------------------------------
   4. ORDEM E AGRUPAMENTO
   --------------------------------------------------------- */

/* Ordem dentro do mesmo dia (US01): primeiro os de dia todo, depois
   os com hora, da mais cedo para a mais tarde. Empate: ordem alfabética.
   Uma função de comparação devolve negativo (a vem antes), positivo
   (b vem antes) ou 0 (tanto faz). */
function compararNoMesmoDia(a, b) {
  if (a.hora === null && b.hora !== null) return -1;
  if (a.hora !== null && b.hora === null) return 1;
  // "09:30" < "10:00" funciona comparando texto, porque as horas têm sempre 2 dígitos.
  if (a.hora !== b.hora) return a.hora < b.hora ? -1 : 1;
  return a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" });
}

/* "Ficou pendente" (US14): da mais antiga para a mais recente (data e
   hora). No mesmo dia, vale a ordem da lista principal. */
function compararPorDataEHora(a, b) {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  return compararNoMesmoDia(a, b);
}

/* "Sem data" (US16): do mais antigo para o mais novo, pelo criadoEm.
   Um item sem criadoEm (não deveria acontecer) vai para o fim. */
function compararPorCriacao(a, b) {
  const criadoA = isoParaData(a.criadoEm);
  const criadoB = isoParaData(b.criadoEm);
  const tempoA = criadoA === null ? Infinity : criadoA.getTime();
  const tempoB = criadoB === null ? Infinity : criadoB.getTime();
  if (tempoA !== tempoB) return tempoA < tempoB ? -1 : 1;
  return a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" });
}

/* Junta os compromissos por data.
   Devolve [{ data: "2026-11-14", itens: [...] }, ...] na ordem pedida:
   do dia mais próximo para o mais distante, ou ao contrário
   (diaMaisRecentePrimeiro = true, usado em "Anteriores"). */
function agruparPorDia(lista, diaMaisRecentePrimeiro) {
  const grupos = {};
  lista.forEach(function (compromisso) {
    if (!grupos[compromisso.data]) grupos[compromisso.data] = [];
    grupos[compromisso.data].push(compromisso);
  });

  // "AAAA-MM-DD" em ordem alfabética já é ordem de data.
  const datas = Object.keys(grupos).sort();
  if (diaMaisRecentePrimeiro) datas.reverse();

  return datas.map(function (data) {
    return { data: data, itens: grupos[data].sort(compararNoMesmoDia) };
  });
}


/* ---------------------------------------------------------
   5. DESENHAR A LISTA
   Etapa 2b: cada compromisso aparece em UMA de quatro seções
   (secaoDoCompromisso, em datas.js): "pendentes", "proximos",
   "sem-data" ou "anteriores". A seção decide a cara do card
   e os botões que ele tem.
   --------------------------------------------------------- */

/* Botões de cada card, nesta ordem (design, seção 13.4.3):
   a ação principal primeiro e "Excluir" sempre por último. */
function acoesDoItem(compromisso, secao) {
  if (secao === "pendentes") return ["feito", "remarcar", "nao-vou-fazer", "excluir"];
  if (secao === "sem-data") return ["agendar", "editar", "excluir"];
  if (secao === "anteriores" && compromisso.status !== "aberto") return ["desfazer", "editar", "excluir"];
  return ["feito", "editar", "excluir"];   // lista principal e "Anteriores" com "Passou"
}

// Texto visível de cada botão do card.
const TEXTOS_DOS_BOTOES = {
  feito: "Feito",
  desfazer: "Desfazer",
  remarcar: "Remarcar",
  "nao-vou-fazer": "Não vou fazer",
  agendar: "Agendar",
  editar: "Editar",
  excluir: "Excluir"
};

// Classe extra do card em cada seção.
const CLASSE_DA_SECAO = {
  proximos: "",
  pendentes: " compromisso--pendente",
  "sem-data": " compromisso--sem-data",
  anteriores: " compromisso--anterior"
};


/* Placa da esquerda: a hora, "Dia todo" ou "Sem data". */
function criarPlaca(compromisso) {
  if (compromisso.data === null) {
    // Placa vazia e tracejada (design, seção 13.6). O <span> deixa o CSS
    // quebrar o texto em "SEM / DATA".
    const placa = criarElemento("div", "compromisso-hora compromisso-hora--sem-data");
    placa.appendChild(criarElemento("span", null, "Sem data"));
    return placa;
  }
  if (compromisso.hora) {
    const placa = criarElemento("div", "compromisso-hora");
    const tempo = criarElemento("time", null, compromisso.hora);
    tempo.dateTime = compromisso.data + "T" + compromisso.hora;
    const fim = horaDeFim(compromisso);
    if (fim === null) {
      placa.appendChild(tempo);
      return placa;
    }
    // Etapa 3a (US19, design 14.4.1): início em cima e fim embaixo.
    // Quem enxerga vê "09:30" e "–10:30"; o leitor de tela ouve
    // "Das 09:30 às 10:30" (o "–" é só enfeite).
    placa.classList.add("compromisso-hora--intervalo");
    const tempoFim = criarElemento("time", null, fim);
    tempoFim.dateTime = compromisso.data + "T" + fim;
    const traco = criarElemento("span", null, "–");
    traco.setAttribute("aria-hidden", "true");
    const metadeDeBaixo = criarElemento("span", "compromisso-hora-fim");
    metadeDeBaixo.append(traco, criarElemento("span", "sr-only", " às "), tempoFim);
    placa.append(criarElemento("span", "sr-only", "Das "), tempo, metadeDeBaixo);
    return placa;
  }
  // O texto fica num <span> para o CSS conseguir quebrar em "DIA / TODO".
  const placa = criarElemento("div", "compromisso-hora compromisso-hora--dia-todo");
  placa.appendChild(criarElemento("span", null, "Dia todo"));
  return placa;
}


/* Selo pequeno ("Cobrar", "Feito", "Não vou fazer", "Passou").
   O ícone é enfeite: a informação está sempre no texto. */
function criarSelo(classe, icone) {
  const selo = criarElemento("p", "selo selo--" + classe);
  selo.appendChild(criarIcone(icone));
  return selo;
}


/* Escreve a linha "Sair às..." (US12) num <p class="compromisso-sair">.
   Ela é usada ao desenhar o card e, a cada minuto, para trocar só o
   texto (sem redesenhar a lista). Sem aria-live: a mudança não é lida
   pelo leitor de tela a cada minuto. */
function preencherSairAs(linha, sair) {
  linha.dataset.estado = sair.estado;
  const texto = criarElemento("span");

  if (sair.estado === "logo") {
    texto.textContent = sair.minutos === 0 ? "Sair agora" : "Sair em " + sair.minutos + " min";
  } else {
    const hora = criarElemento("time", "compromisso-sair-hora", horaParaTexto(sair.horaSair));
    hora.dateTime = dataHoraParaAtributo(sair.horaSair);
    if (sair.estado === "normal") {
      texto.append("Sair às ", hora, sair.diaAnterior ? " do dia anterior" : "");
    } else {
      texto.append("Hora de sair: ", hora, " (já passou)");
    }
  }
  linha.replaceChildren(criarIcone("sair"), texto);
}


/* Linha de "meta", logo abaixo do título (design, seção 13.4.1):
   - lista principal: "Sair às..." e o selo "Cobrar" (só se tiver algum);
   - "Anteriores": a situação ("Feito", "Não vou fazer" ou "Passou").
   Devolve null quando não há nada para mostrar (nada de espaço vazio). */
function criarMeta(compromisso, secao, agora) {
  const meta = criarElemento("div", "compromisso-meta");

  if (secao === "proximos") {
    const sair = calcularSairAs(compromisso, agora);
    if (sair) {
      const linha = criarElemento("p", "compromisso-sair");
      preencherSairAs(linha, sair);
      meta.appendChild(linha);
    }
    if (compromisso.cobrar) {
      const selo = criarSelo("cobrar", "cobrar");
      selo.append("Cobrar", criarElemento("span", "sr-only", " se eu não fizer"));
      meta.appendChild(selo);
    }
  }

  if (secao === "anteriores") {
    const situacao = situacaoDoCompromisso(compromisso);
    const icone = situacao.classe === "nao-vou-fazer" ? "nao-vou-fazer" : situacao.classe;
    const selo = criarSelo(situacao.classe, icone);
    selo.append(criarElemento("span", "sr-only", "Situação: "), situacao.texto);
    meta.appendChild(selo);
  }

  return meta.children.length > 0 ? meta : null;
}


/* "Ontem · 09:30" ou "Ter, 11/11 · Dia todo": quando era a pendência.
   Usado no card de "Ficou pendente" e no subtítulo do "Remarcar".
   O "·" é enfeite; o leitor de tela ouve "Ontem, 09:30". */
function criarValorEra(compromisso, agora) {
  const valor = criarElemento("span", "compromisso-era-valor", tituloDoDia(compromisso.data, agora, false).texto);
  const ponto = criarElemento("span", null, " · ");
  ponto.setAttribute("aria-hidden", "true");
  valor.append(ponto, criarElemento("span", "sr-only", ", "), compromisso.hora || "Dia todo");
  return valor;
}


/* ---------------------------------------------------------
   5b. ETAPA 3a NO CARD: CONFLITO, APERTO E "O QUE LEVAR"
   --------------------------------------------------------- */

/* Calcula os avisos de conflito e de aperto (US20) para os compromissos
   da lista "Próximos". Devolve um Map: id do compromisso -> aviso.
   Quem pode atrapalhar (o "A" da seção 3) é qualquer compromisso com
   data, hora e "aberto", em qualquer seção (até um que já passou mas
   ainda não acabou). Dia todo, sem data, "Feito" e "Não vou fazer"
   ficam de fora. */
function calcularAvisosDeHorario(proximos) {
  const comHora = compromissos.filter(function (c) {
    return c.data !== null && c.hora !== null && c.status === "aberto";
  });
  // A ordem da US01 (data, hora, título). O sort é "estável": num empate
  // completo (mesmo título no mesmo minuto) fica a ordem da lista, a
  // mesma que a tela usa. Assim "quem vem antes" é igual ao que se vê.
  const ordenados = comHora.slice().sort(compararPorDataEHora);

  const avisos = new Map();
  proximos.forEach(function (b) {
    if (b.hora === null) return;   // dia todo: fora da comparação
    const posicao = ordenados.indexOf(b);
    const antesNoMesmoDia = ordenados.slice(0, posicao).filter(function (a) { return a.data === b.data; });
    const aviso = avisoDeHorario(b, antesNoMesmoDia);
    if (aviso) avisos.set(b.id, aviso);
  });
  return avisos;
}

/* A tarja "Conflito:" ou "Aperto:" (design, seção 14.4.2). Sem aria-live:
   é lida junto com o card. O título do outro compromisso entra como
   texto (append de texto = textContent), nunca como HTML. */
function criarAvisoDeHorario(aviso) {
  const ehConflito = aviso.tipo === "conflito";
  const tarja = criarElemento("p", "compromisso-aviso compromisso-aviso--" + aviso.tipo);
  tarja.appendChild(criarIcone(aviso.tipo));

  const texto = criarElemento("span");
  texto.appendChild(criarElemento("strong", "compromisso-aviso-tipo", ehConflito ? "Conflito:" : "Aperto:"));
  if (ehConflito && aviso.fim === null) {
    texto.append(" mesmo horário de " + aviso.outro.titulo + ".");
  } else if (ehConflito) {
    texto.append(" " + aviso.outro.titulo + " vai até " + aviso.fim + ".");
  } else {
    texto.append(" sair às " + aviso.sair + ", mas " + aviso.outro.titulo + " vai até " + aviso.fim + ".");
  }
  tarja.appendChild(texto);
  return tarja;
}


/* Texto do botão do checklist: "O que levar (2 de 5)" ou, com todos
   marcados, "O que levar: tudo pronto (5 de 5)". */
function textosDoChecklist(itens) {
  const marcados = itens.filter(function (item) { return item.feito; }).length;
  const pronto = marcados === itens.length;
  return {
    pronto: pronto,
    rotulo: pronto ? "O que levar: tudo pronto" : "O que levar",
    contagem: "(" + marcados + " de " + itens.length + ")"
  };
}

/* Escreve (ou reescreve) o conteúdo do botão "O que levar". Usada ao
   desenhar o card e depois de marcar um item: aí só o botão muda e a
   caixa marcada continua com o foco (design, seção 14.4.3). */
function preencherBotaoDoChecklist(botao, compromisso) {
  const textos = textosDoChecklist(compromisso.itens);
  botao.closest(".checklist").classList.toggle("checklist--pronto", textos.pronto);

  const rotulo = criarElemento("span", "checklist-rotulo", textos.rotulo + " ");
  rotulo.appendChild(criarElemento("span", "checklist-contagem", textos.contagem));
  botao.replaceChildren(
    criarIcone(textos.pronto ? "feito" : "mala", "checklist-icone"),
    rotulo,
    criarIcone("seta", "checklist-seta")
  );
  // Nome acessível: "O que levar (2 de 5), Dentista". Usamos aria-label,
  // e não um <span class="sr-only">, pelo mesmo motivo do botão "Feito":
  // o pedaço escondido ganharia um espaço antes da vírgula.
  botao.setAttribute("aria-label", textos.rotulo + " " + textos.contagem + ", " + compromisso.titulo);
}

/* "O que levar" no card (US18): o botão que abre e fecha e a lista de
   caixas de marcar. Sem itens, não cria nada (devolve null). */
function criarChecklist(compromisso) {
  if (compromisso.itens.length === 0) {
    // Ficou sem itens: esquece que estava aberto. Se ganhar itens de
    // novo, o botão volta fechado, como na primeira vez.
    checklistsAbertos.delete(compromisso.id);
    return null;
  }

  const aberto = checklistsAbertos.has(compromisso.id);
  const idDaLista = "checklist-" + compromisso.id;
  const caixa = criarElemento("div", "checklist");

  const botao = criarElemento("button", "checklist-botao");
  botao.type = "button";
  botao.dataset.acao = "checklist";
  botao.setAttribute("aria-expanded", String(aberto));
  botao.setAttribute("aria-controls", idDaLista);
  caixa.appendChild(botao);
  preencherBotaoDoChecklist(botao, compromisso);

  const lista = criarElemento("ul", "checklist-lista");
  lista.id = idDaLista;
  lista.setAttribute("aria-label", "O que levar: " + compromisso.titulo);
  lista.hidden = !aberto;
  compromisso.itens.forEach(function (item, indice) {
    const marcar = criarElemento("input", "marcar-caixa");
    marcar.type = "checkbox";
    marcar.checked = item.feito;
    marcar.dataset.acao = "marcar-item";
    marcar.dataset.indice = String(indice);
    // O <label> em volta liga o texto à caixa: a linha inteira é clicável.
    const rotulo = criarElemento("label", "marcar checklist-item");
    rotulo.append(marcar, criarElemento("span", null, item.texto));
    const li = criarElemento("li");
    li.appendChild(rotulo);
    lista.appendChild(li);
  });
  caixa.appendChild(lista);
  return caixa;
}


/* Um compromisso (design, seções 6.3 e 13.4). secao = onde ele aparece. */
function criarItem(compromisso, secao, agora) {
  const item = criarElemento("li", "compromisso" + CLASSE_DA_SECAO[secao]);
  item.dataset.id = compromisso.id;
  // tabindex -1: o item pode receber foco pelo código (depois de excluir
  // o vizinho), mas não entra na ordem do Tab.
  item.tabIndex = -1;

  item.appendChild(criarPlaca(compromisso));

  // Texto: título, a linha de meta (ou "Era para:"), e local e
  // observação só se estiverem preenchidos.
  const corpo = criarElemento("div", "compromisso-corpo");
  corpo.appendChild(criarElemento("p", "compromisso-titulo", compromisso.titulo));

  const meta = criarMeta(compromisso, secao, agora);
  if (meta) corpo.appendChild(meta);

  if (secao === "pendentes") {
    const era = criarElemento("p", "compromisso-era");
    era.append(criarElemento("span", null, "Era para:"), " ", criarValorEra(compromisso, agora));
    corpo.appendChild(era);
  }

  // Etapa 3a (US20): conflito ou aperto, só na lista "Próximos".
  if (secao === "proximos" && avisosDeHorario.has(compromisso.id)) {
    corpo.appendChild(criarAvisoDeHorario(avisosDeHorario.get(compromisso.id)));
  }

  if (compromisso.local) {
    const local = criarElemento("p", "compromisso-local");
    local.appendChild(criarIcone("local"));
    local.appendChild(criarElemento("span", "sr-only", "Local: "));
    local.appendChild(criarElemento("span", null, compromisso.local));
    corpo.appendChild(local);
  }

  if (compromisso.observacao) {
    const obs = criarElemento("p", "compromisso-obs");
    obs.appendChild(criarElemento("span", "sr-only", "Observação: "));
    obs.appendChild(document.createTextNode(compromisso.observacao));
    corpo.appendChild(obs);
  }
  item.appendChild(corpo);

  // Etapa 3a (US18): "O que levar", entre o texto e os botões, em todas
  // as seções. Assim o Tab passa por ele antes de "Feito" e "Editar".
  const checklist = criarChecklist(compromisso);
  if (checklist) item.appendChild(checklist);

  const acoes = criarElemento("div", "compromisso-acoes");
  acoesDoItem(compromisso, secao).forEach(function (acao) {
    acoes.appendChild(criarBotaoDoItem(acao, compromisso.titulo));
  });
  item.appendChild(acoes);

  return item;
}

/* Um botão do card. O texto visível é "Editar", "Feito"...; o título vai
   escondido (sr-only), então o leitor de tela ouve "Editar Dentista". */
function criarBotaoDoItem(acao, titulo) {
  let classe = "botao-item";
  if (acao === "excluir") classe += " botao-item--perigo";
  if (acao === "feito") classe += " botao-item--feito";
  if (acao === "agendar") classe += " botao-item--agendar";

  const botao = criarElemento("button", classe);
  botao.type = "button";
  botao.dataset.acao = acao;
  botao.appendChild(criarIcone(acao));
  botao.appendChild(document.createTextNode(TEXTOS_DOS_BOTOES[acao]));

  if (acao === "feito") {
    // "Feito: marcar Dentista como feito" (design, seção 13.4.3).
    // Aqui usamos aria-label, e não o <span class="sr-only">: como no "Depois"
    // da faixa de lembrete, o pedaço escondido ganharia um espaço antes
    // (o leitor de tela ouviria "Feito : marcar..."). O aria-label continua
    // começando pelo texto visível, o que ajuda quem usa comando de voz.
    botao.setAttribute("aria-label", "Feito: marcar " + titulo + " como feito");
  } else {
    botao.appendChild(criarElemento("span", "sr-only", " " + titulo));
  }
  return botao;
}


/* Um dia com os seus compromissos (design, seção 6.2).
   secao = "proximos" ou "anteriores": o mesmo dia (ex.: hoje) pode
   aparecer nas duas listas, e um id não pode se repetir na página,
   por isso o nome da seção entra no id do título. */
function criarDia(grupo, agora, secao) {
  const ehAnterior = secao === "anteriores";
  const titulo = tituloDoDia(grupo.data, agora, !ehAnterior);
  const idDoTitulo = secao + "-dia-" + grupo.data;

  const elemento = criarElemento("section", "dia");
  // Só o "Hoje" da lista principal ganha a cor âmbar.
  if (!ehAnterior && titulo.texto === "Hoje") elemento.classList.add("dia--hoje");
  elemento.setAttribute("aria-labelledby", idDoTitulo);

  const h3 = criarElemento("h3", "dia-titulo", titulo.texto);
  h3.id = idDoTitulo;
  if (titulo.contagem) {
    const contagem = criarElemento("span", "dia-contagem");
    const ponto = criarElemento("span", null, " · ");
    ponto.setAttribute("aria-hidden", "true");   // o "·" é só enfeite
    contagem.appendChild(ponto);
    contagem.appendChild(document.createTextNode(titulo.contagem));
    h3.appendChild(contagem);
  }
  elemento.appendChild(h3);

  const ul = criarElemento("ul", "compromissos");
  grupo.itens.forEach(function (compromisso) {
    ul.appendChild(criarItem(compromisso, secao, agora));
  });
  elemento.appendChild(ul);
  return elemento;
}


/* Mensagem de lista vazia (design, seção 6.4). */
function criarVazio() {
  const vazio = criarElemento("div", "vazio");
  vazio.appendChild(criarDeHtmlFixo(ILUSTRACAO_VAZIO));
  vazio.appendChild(criarElemento("p", "vazio-titulo", "Nenhum compromisso por vir"));
  vazio.appendChild(criarElemento("p", "vazio-texto", "Anote o próximo e ele aparece aqui, no dia certo."));

  const botao = criarElemento("button", "btn btn-primario");
  botao.type = "button";
  botao.dataset.acao = "novo";
  botao.appendChild(criarIcone("mais"));
  botao.appendChild(document.createTextNode("Novo compromisso"));
  vazio.appendChild(botao);
  return vazio;
}


/* Separa os compromissos pelas quatro seções, de acordo com a hora atual. */
function separarPorSecao(agora) {
  const secoes = { pendentes: [], proximos: [], "sem-data": [], anteriores: [] };
  compromissos.forEach(function (compromisso) {
    secoes[secaoDoCompromisso(compromisso, agora)].push(compromisso);
  });
  return secoes;
}


/* Resumo do que a tela mostra: o dia de hoje (para "Amanhã" virar
   "Hoje" e "Hoje" virar "Ontem" depois da meia-noite) + em que seção
   está cada compromisso (para ele mudar de seção quando passa). */
function calcularResumo(agora) {
  const lugares = compromissos.map(function (c) {
    return c.id + ":" + secaoDoCompromisso(c, agora);
  });
  return hojeEmTexto(agora) + "|" + lugares.sort().join(",");
}


/* Lista simples, sem grupos por dia ("Ficou pendente" e "Sem data"). */
function preencherListaSimples(ul, itens, secao, agora) {
  itens.forEach(function (compromisso) {
    ul.appendChild(criarItem(compromisso, secao, agora));
  });
}


/* Redesenha as quatro seções a partir da memória. */
function desenharLista() {
  const agora = new Date();
  const secoes = separarPorSecao(agora);

  // Se o foco estava num compromisso, anotamos qual para devolver o foco
  // depois de redesenhar (senão ele "cairia" no topo da página).
  const focoAntes = lembrarFocoNaLista();

  // Etapa 3a (US20): os avisos são calculados de novo a cada desenho
  // (criar, editar, excluir, importar, Feito, Desfazer e a cada minuto
  // em que algo muda de seção).
  avisosDeHorario = calcularAvisosDeHorario(secoes.proximos);

  // "Ficou pendente" (US14): sempre aberta; sem pendências, some.
  listaPendentes.replaceChildren();
  secaoPendentes.hidden = secoes.pendentes.length === 0;
  contagemPendentes.textContent = "(" + secoes.pendentes.length + ")";
  preencherListaSimples(listaPendentes, secoes.pendentes.sort(compararPorDataEHora), "pendentes", agora);

  // Lista principal
  listaProximos.replaceChildren();
  if (secoes.proximos.length === 0) {
    // Continua vazia mesmo se houver itens sem data (US16).
    listaProximos.appendChild(criarVazio());
  } else {
    const dias = criarElemento("div", "dias");
    agruparPorDia(secoes.proximos, false).forEach(function (grupo) {
      dias.appendChild(criarDia(grupo, agora, "proximos"));
    });
    listaProximos.appendChild(dias);
  }

  // "Sem data" (US16) e "Anteriores" (US06): sem nenhum item, a seção
  // inteira some. O estado aberto/fechado não muda aqui: só o botão muda isso.
  listaSemData.replaceChildren();
  secaoSemData.hidden = secoes["sem-data"].length === 0;
  contagemSemData.textContent = "(" + secoes["sem-data"].length + ")";
  if (secoes["sem-data"].length > 0) {
    const ul = criarElemento("ul", "compromissos");
    preencherListaSimples(ul, secoes["sem-data"].sort(compararPorCriacao), "sem-data", agora);
    listaSemData.appendChild(ul);
  }

  listaAnteriores.replaceChildren();
  secaoAnteriores.hidden = secoes.anteriores.length === 0;
  contagemAnteriores.textContent = "(" + secoes.anteriores.length + ")";
  if (secoes.anteriores.length > 0) {
    const dias = criarElemento("div", "dias");
    agruparPorDia(secoes.anteriores, true).forEach(function (grupo) {
      dias.appendChild(criarDia(grupo, agora, "anteriores"));
    });
    listaAnteriores.appendChild(dias);
  }

  resumoDaTela = calcularResumo(agora);

  if (focoAntes) focarCompromisso(focoAntes.id, focoAntes.acao, focoAntes.indice);
}


/* A cada minuto (e quando a aba volta a ficar visível): se algum
   compromisso mudou de seção ou o dia virou, redesenha tudo. Se não,
   troca só o texto das linhas "Sair às..." (US12), sem redesenhar a
   lista: assim o foco e o leitor de tela não são incomodados. */
function atualizarSeMudou() {
  const agora = new Date();
  if (calcularResumo(agora) !== resumoDaTela) {
    desenharLista();
    return;
  }
  listaProximos.querySelectorAll(".compromisso-sair").forEach(function (linha) {
    const id = linha.closest(".compromisso").dataset.id;
    const compromisso = compromissos.find(function (c) { return c.id === id; });
    const sair = compromisso ? calcularSairAs(compromisso, agora) : null;
    if (sair) preencherSairAs(linha, sair);
  });
}

/* Agenda a próxima conferência para logo depois da virada do minuto
   (ex.: 10:01:00), e não "60 segundos depois de abrir a página".
   Assim um compromisso das 10:00 vai para "Anteriores" às 10:01 em ponto. */
function agendarProximoMinuto() {
  const faltaParaVirar = 60000 - (Date.now() % 60000);
  setTimeout(function () {
    atualizarSeMudou();
    agendarProximoMinuto();
  }, faltaParaVirar + 200);
}


/* ---------------------------------------------------------
   6. FOCO
   --------------------------------------------------------- */

/* Um elemento está visível se ocupa algum espaço na tela
   (dentro de algo "hidden" ele não ocupa nenhum). */
function estaVisivel(elemento) {
  return elemento !== null && elemento.isConnected && elemento.getClientRects().length > 0;
}

/* Se o foco está num compromisso, devolve { id, acao, indice }.
   indice: só nas caixas do checklist (qual item estava com o foco). */
function lembrarFocoNaLista() {
  const ativo = document.activeElement;
  if (!ativo || !areaPrincipal.contains(ativo)) return null;
  const item = ativo.closest(".compromisso");
  if (!item) return null;
  return { id: item.dataset.id, acao: ativo.dataset.acao || "item", indice: ativo.dataset.indice };
}

/* Acha o card de um compromisso na página (ou null). */
function acharItem(id, dentroDe) {
  return (dentroDe || areaPrincipal).querySelector('.compromisso[data-id="' + CSS.escape(id) + '"]');
}

/* Põe o foco num compromisso: no botão pedido ("editar", "feito"...)
   ou no próprio item ("item"). Se o card não tem esse botão (ex.: não há
   "Editar" em "Ficou pendente"), o foco vai para o próprio item.
   Se ele estiver dentro de "Sem data" ou "Anteriores" fechados, o foco vai
   para o botão que abre a seção; se ele não existir mais, vai para o
   botão "Novo compromisso". */
function focarCompromisso(id, acao, indice) {
  const item = acharItem(id);
  if (!item) {
    botaoNovo.focus();
    return;
  }
  // Etapa 3a: uma caixa do checklist é achada pela ação + o número do item.
  let seletor = '[data-acao="' + acao + '"]';
  if (indice !== undefined) seletor += '[data-indice="' + indice + '"]';
  const alvo = (acao !== "item" && item.querySelector(seletor)) || item;
  if (estaVisivel(alvo)) {
    alvo.focus();
    return;
  }
  // .sem-data e .anteriores usam o mesmo botão de abrir (.anteriores-botao).
  const secaoFechada = item.closest(".sem-data, .anteriores");
  const botaoDeAbrir = secaoFechada ? secaoFechada.querySelector(".anteriores-botao") : null;
  if (estaVisivel(botaoDeAbrir)) {
    botaoDeAbrir.focus();
  } else {
    botaoNovo.focus();
  }
}

/* Em qual das quatro listas o compromisso está agora (ou null). */
function listaQueContem(id) {
  return [listaPendentes, listaProximos, listaSemData, listaAnteriores].find(function (lista) {
    return acharItem(id, lista) !== null;
  }) || null;
}

/* Depois de excluir, marcar Feito etc., o foco vai para o próximo
   compromisso da mesma lista (US05 e US13). Aqui descobrimos qual é
   ele, ANTES de a lista mudar. */
function idDoProximoNaLista(id) {
  const lista = listaQueContem(id);
  if (!lista) return null;
  const itens = Array.from(lista.querySelectorAll(".compromisso"));
  const posicao = itens.findIndex(function (item) { return item.dataset.id === id; });
  const proximo = itens[posicao + 1];
  return proximo ? proximo.dataset.id : null;
}

/* Foco depois que um compromisso pode ter mudado de seção (US13, US15).
   - Saiu da lista em que estava: vai para o próximo compromisso dessa
     lista ou, se não houver, para "Novo compromisso".
   - Continuou na mesma lista (ex.: "Feito" num item de "Anteriores", que
     continua em "Anteriores"): vai para o botão "acaoSeFicou" do próprio
     card redesenhado (ex.: o "Desfazer" que acabou de aparecer). */
function focarDepoisDeMudar(id, listaDeOnde, idSeguinte, acaoSeFicou) {
  if (listaDeOnde && acharItem(id, listaDeOnde)) {
    focarCompromisso(id, acaoSeFicou);
  } else if (idSeguinte) {
    focarCompromisso(idSeguinte, "item");
  } else {
    botaoNovo.focus();
  }
}

/* Quando uma janela fecha (Salvar, Cancelar, Esc ou Excluir). */
function devolverFoco() {
  if (focoDepoisDeFechar) {
    focoDepoisDeFechar();
  } else if (estaVisivel(botaoQueAbriu)) {
    botaoQueAbriu.focus();
  } else if (botaoQueAbriu && botaoQueAbriu.dataset.idDoItem) {
    // O botão foi redesenhado: procuramos o novo botão do mesmo compromisso.
    focarCompromisso(botaoQueAbriu.dataset.idDoItem, botaoQueAbriu.dataset.acao);
  } else {
    botaoNovo.focus();
  }
  focoDepoisDeFechar = null;
  botaoQueAbriu = null;
}


/* ---------------------------------------------------------
   7. AVISOS
   --------------------------------------------------------- */

/* Aviso flutuante (some em 5 segundos). É uma região viva (role="status"):
   o leitor de tela lê a mudança de texto sem tirar o foco do lugar. */
function mostrarStatus(texto, tipo) {
  clearTimeout(relogioDoStatus);
  avisoStatus.dataset.tipo = tipo || "sucesso";
  // Esvazia antes e escreve no quadro seguinte: assim, se a mesma frase
  // aparecer duas vezes seguidas, o leitor de tela lê de novo.
  avisoStatus.textContent = "";
  requestAnimationFrame(function () {
    avisoStatus.textContent = texto;
  });
  relogioDoStatus = setTimeout(function () {
    avisoStatus.textContent = "";   // vazio = escondido (CSS :empty)
  }, 5000);
}

/* Faixa no topo do conteúdo (fica até recarregar a página).
   tipo = "alerta" (âmbar) ou "erro" (vermelho). */
function mostrarFaixa(tipo, texto) {
  // Se a mesma faixa já está na tela, tiramos e pomos de novo
  // (não duplica e o leitor de tela lê outra vez).
  Array.from(faixas.children).forEach(function (faixa) {
    if (faixa.textContent === texto) faixa.remove();
  });

  const faixa = criarElemento("p", "faixa faixa--" + tipo);
  faixa.appendChild(criarIcone("alerta"));
  faixa.appendChild(criarElemento("span", null, texto));
  // As faixas de problema ficam sempre ANTES do lembrete de cópia (US07, 2a).
  // insertBefore(nova, null) põe no fim, então funciona com ou sem lembrete.
  faixas.insertBefore(faixa, document.getElementById("faixa-lembrete"));
  faixa.scrollIntoView({ block: "nearest" });
}


/* ---------------------------------------------------------
   8. FORMULÁRIO (criar, editar, remarcar e agendar)
   É sempre o mesmo formulário. Na Etapa 2b ele ganhou "Ainda sem
   data" (US16), "Tempo para sair" (US12) e "Me cobrar" (US14), e
   abre também como "Remarcar compromisso" (US15) e "Agendar
   compromisso" (US16).
   --------------------------------------------------------- */

// Título da janela em cada modo.
const TITULOS_DO_FORMULARIO = {
  novo: "Novo compromisso",
  editar: "Editar compromisso",
  remarcar: "Remarcar compromisso",
  agendar: "Agendar compromisso"
};

// Opções fixas do "Tempo para sair". Outro valor aparece em "Outro".
const OPCOES_DE_SAIDA = ["15", "30", "45", "60"];


/* Mostra o erro de um campo: texto visível + aria-invalid + aria-describedby.
   O aria-describedby só é ligado enquanto o erro aparece: alguns navegadores
   leem a descrição mesmo quando o texto está escondido. Se o campo tem uma
   dica fixa (data-dica, ex.: minutos), ela continua ligada junto com o erro. */
function mostrarErro(campo, erro) {
  erro.hidden = false;
  campo.setAttribute("aria-invalid", "true");
  campo.setAttribute("aria-describedby", campo.dataset.dica ? campo.dataset.dica + " " + erro.id : erro.id);
}

function esconderErro(campo, erro) {
  erro.hidden = true;
  campo.removeAttribute("aria-invalid");
  if (campo.dataset.dica) {
    campo.setAttribute("aria-describedby", campo.dataset.dica);
  } else {
    campo.removeAttribute("aria-describedby");
  }
}


/* Qual opção do "Tempo para sair" está marcada: "", "15"... ou "outro". */
function opcaoDeSaidaMarcada() {
  const marcada = Array.from(opcoesDeSaida).find(function (opcao) { return opcao.checked; });
  return marcada ? marcada.value : "";
}

/* Marca a opção que corresponde a um antecedenciaMin salvo (US12):
   null = "Nenhum"; 15/30/45/60 = a plaquinha; outro número = "Outro". */
function marcarOpcaoDeSaida(minutos) {
  let valor = "";
  if (minutos !== null) {
    valor = OPCOES_DE_SAIDA.includes(String(minutos)) ? String(minutos) : "outro";
  }
  opcoesDeSaida.forEach(function (opcao) { opcao.checked = opcao.value === valor; });
  campoMinutos.value = valor === "outro" ? String(minutos) : "";
}

/* Os minutos digitados em "Outro", se forem um número inteiro de 1 a 720.
   Senão, null. (Um campo type="number" com texto inválido entrega "".) */
function minutosDigitados() {
  const texto = campoMinutos.value.trim();
  if (!/^\d+$/.test(texto)) return null;
  const minutos = Number(texto);
  return antecedenciaValida(minutos) ? minutos : null;
}


/* Liga e desliga os campos que dependem de outros (US12, US14 e US16):
   - "Ainda sem data" marcada: Data e Hora desativadas e vazias,
     "(obrigatório)" some, "Me cobrar" desativada;
   - sem hora (ou sem data): "Tempo para sair" desativado, com a dica;
   - "Outro" marcado: aparece o campo de minutos.
   Roda ao abrir o formulário e a cada mudança nesses campos. */
function atualizarCamposDependentes() {
  const semData = campoSemData.checked;

  campoData.disabled = semData;
  campoHora.disabled = semData;
  dataObrigatorio.hidden = semData;
  if (semData) {
    campoData.value = "";
    campoHora.value = "";
    esconderErro(campoData, erroData);   // sem data, "Escolha uma data." não vale
  }

  // Um fieldset com "disabled" desativa de uma vez as plaquinhas e o
  // campo de minutos. A opção marcada continua marcada (fica cinza).
  const temHora = !semData && campoHora.value !== "";
  grupoSair.disabled = !temHora;
  dicaSair.hidden = temHora;
  if (temHora) {
    grupoSair.removeAttribute("aria-describedby");
  } else {
    grupoSair.setAttribute("aria-describedby", "dica-sair");
  }

  const outro = opcaoDeSaidaMarcada() === "outro";
  blocoMinutos.hidden = !outro;
  if (!temHora || !outro) esconderErro(campoMinutos, erroMinutos);   // o campo não vale agora

  campoCobrar.disabled = semData;

  // Etapa 3a (US19): sem hora, "Hora de fim" fica desativada e VAZIA
  // ("Sem hora de fim"); a dica muda para "Escolha uma hora...".
  // Quando a Hora volta, os campos continuam vazios.
  grupoFim.disabled = !temHora;
  dicaFim.hidden = !temHora;
  dicaFimSemHora.hidden = temHora;
  grupoFim.setAttribute("aria-describedby", temHora ? "dica-fim" : "dica-fim-sem-hora");
  if (!temHora) {
    campoFim.value = "";
    campoDuracao.value = "";
    campoDuracaoMin.value = "";
    esconderErrosDoFim();
  }
  blocoDuracaoMin.hidden = campoDuracao.value !== "outro";
}


/* Abre o formulário.
   compromisso = null para criar um novo, ou o compromisso a mudar.
   modo = "novo", "editar", "remarcar" ou "agendar". */
function abrirFormulario(compromisso, botao, modo) {
  botaoQueAbriu = botao;
  focoDepoisDeFechar = null;
  modoDoFormulario = modo;
  formulario.reset();   // limpa os campos e volta as caixas e opções ao padrão
  erroSalvar.hidden = true;
  esconderErro(campoTitulo, erroTitulo);
  esconderErro(campoData, erroData);
  esconderErro(campoMinutos, erroMinutos);
  esconderErrosDoFim();
  avisoItens.textContent = "";   // a região de avisos do checklist começa vazia

  tituloDaJanela.textContent = TITULOS_DO_FORMULARIO[modo];
  subtituloDaJanela.hidden = modo !== "remarcar";

  if (compromisso) {
    idEmEdicao = compromisso.id;
    campoTitulo.value = compromisso.titulo;
    campoSemData.checked = compromisso.data === null;
    campoData.value = compromisso.data || "";
    campoHora.value = compromisso.hora || "";
    marcarOpcaoDeSaida(compromisso.antecedenciaMin);
    campoCobrar.checked = compromisso.cobrar;
    campoLocal.value = compromisso.local || "";
    campoObs.value = compromisso.observacao || "";
    // Etapa 3a: "Termina às" calculado e a Duração na opção certa (US19),
    // e uma CÓPIA dos itens (mexer nela não muda o compromisso até Salvar).
    mostrarDuracaoNoFormulario(compromisso.hora, compromisso.duracaoMin);
    itensDoFormulario = compromisso.itens.map(function (item) {
      return { texto: item.texto, feito: item.feito };
    });

    if (modo === "agendar") {
      // US16: "Ainda sem data" desmarcada e a Data com o dia de hoje.
      campoSemData.checked = false;
      campoData.value = hojeEmTexto(new Date());
    }
    if (modo === "remarcar") {
      // "Era para: Ontem · 09:30" (design, seção 13.8.3)
      valorDoSubtitulo.replaceChildren(...criarValorEra(compromisso, new Date()).childNodes);
    }
  } else {
    idEmEdicao = null;
    campoData.value = hojeEmTexto(new Date());   // a data já vem com hoje
    itensDoFormulario = [];
  }

  atualizarCamposDependentes();
  desenharItensDoFormulario();

  // showModal(): abre por cima da página; Esc fecha e o Tab fica preso dentro.
  janelaCompromisso.showModal();
  // Remarcar e Agendar: a pessoa veio mudar a data, então o foco vai para ela.
  if (modo === "remarcar" || modo === "agendar") {
    campoData.focus();
  } else {
    campoTitulo.focus();
  }
}

/* Confere os campos. Devolve true se está tudo certo. */
function validarFormulario() {
  const semData = campoSemData.checked;
  const tituloOk = campoTitulo.value.trim() !== "";
  // Data vazia ou incompleta: o navegador entrega "" no value.
  // Com "Ainda sem data", a data não é obrigatória (US16).
  const dataOk = semData || dataValida(campoData.value);
  // O campo de minutos só vale com hora e com "Outro" marcado (US12).
  const usaMinutos = !semData && campoHora.value !== "" && opcaoDeSaidaMarcada() === "outro";
  const minutosOk = !usaMinutos || minutosDigitados() !== null;

  if (tituloOk) esconderErro(campoTitulo, erroTitulo); else mostrarErro(campoTitulo, erroTitulo);
  if (dataOk) esconderErro(campoData, erroData); else mostrarErro(campoData, erroData);
  if (minutosOk) esconderErro(campoMinutos, erroMinutos); else mostrarErro(campoMinutos, erroMinutos);

  // Etapa 3a (US19): a hora de fim tem no máximo UM problema por vez.
  const fim = avaliarHoraDeFim();
  esconderErrosDoFim();
  const camposDoFim = { fim: [campoFim, erroFim], duracao: [campoDuracao, erroDuracao], minutos: [campoDuracaoMin, erroDuracaoMin] };
  if (fim.erro) mostrarErro(camposDoFim[fim.erro][0], camposDoFim[fim.erro][1]);

  // O foco vai para o primeiro campo com problema, na ordem do formulário:
  // Título, Data, Hora de fim (Termina às, Duração ou Minutos), Minutos antes.
  let campoComErro = null;
  if (!tituloOk) {
    campoComErro = campoTitulo;
  } else if (!dataOk) {
    campoComErro = campoData;
  } else if (fim.erro) {
    campoComErro = camposDoFim[fim.erro][0];
  } else if (!minutosOk) {
    campoComErro = campoMinutos;
  }
  if (campoComErro) {
    campoComErro.focus();
    // O focus() rola a janela só até a borda do campo: no celular, com o
    // formulário rolado até o fim, o rótulo ficava escondido lá em cima.
    // Por isso rolamos o bloco inteiro (.campo = rótulo + campo + mensagem)
    // para dentro da tela. "nearest" = rola o mínimo necessário.
    campoComErro.closest(".campo").scrollIntoView({ block: "nearest" });
  }
  return tituloOk && dataOk && minutosOk && !fim.erro;
}

/* Os dados digitados, no formato da versão 2 (seção 3 dos requisitos). */
function lerCamposDoFormulario() {
  const semData = campoSemData.checked;
  // O campo de hora entrega "HH:MM" (às vezes com segundos: cortamos em 5 letras).
  const textoHora = !semData && campoHora.value ? campoHora.value.slice(0, 5) : null;
  const hora = horaValida(textoHora) ? textoHora : null;   // sem hora = dia todo

  // Tempo para sair: só com hora. Apagou a hora, o tempo para sair vai junto.
  let antecedenciaMin = null;
  if (hora !== null) {
    const opcao = opcaoDeSaidaMarcada();
    if (opcao === "outro") antecedenciaMin = minutosDigitados();
    else if (opcao !== "") antecedenciaMin = Number(opcao);
  }

  return {
    titulo: campoTitulo.value.trim(),
    data: semData ? null : campoData.value,      // null = "Sem data"
    hora: hora,
    local: textoOuNulo(campoLocal.value, 100),     // vazio vira null
    observacao: textoOuNulo(campoObs.value, 500),
    antecedenciaMin: antecedenciaMin,
    cobrar: !semData && campoCobrar.checked,       // sem data, nunca cobra
    // Etapa 3a: só a duração é guardada (US19); sem hora, null.
    duracaoMin: hora !== null ? avaliarHoraDeFim().duracaoMin : null,
    // Uma cópia da lista do formulário (item novo já entrou com feito: false).
    itens: itensDoFormulario.map(function (item) { return { texto: item.texto, feito: item.feito }; })
  };
}

/* O aviso depois de salvar. Depende do modo do formulário e de para
   onde o compromisso foi (secaoDoCompromisso). Devolve { texto, tipo }. */
function avisoDoFormulario(modo, antes, depois, agora) {
  const secao = secaoDoCompromisso(depois, agora);
  const sucesso = function (texto) { return { texto: texto, tipo: "sucesso" }; };

  if (modo === "novo") {
    if (secao === "sem-data") return sucesso("Anotado em Sem data.");
    // Data ou hora no passado é permitido: ele vai direto para "Anteriores".
    if (secao === "anteriores") return sucesso("Compromisso salvo em Anteriores.");
    // [Interpretação do dev] Os requisitos não trazem o texto para um item
    // NOVO, com "Me cobrar", que já nasce no passado (vai para "Ficou pendente").
    if (secao === "pendentes") return sucesso("Compromisso salvo em Ficou pendente.");
    return sucesso("Compromisso salvo.");
  }

  // Marcou "Ainda sem data" num item que tinha data (US16).
  if (secao === "sem-data" && antes.data !== null) return sucesso("Anotado em Sem data.");

  if (modo === "agendar") {
    return secao === "sem-data" ? sucesso("Anotado em Sem data.") : sucesso("Compromisso agendado.");
  }

  if (modo === "remarcar") {
    if (secao === "proximos") return sucesso("Compromisso remarcado.");
    // A nova data ainda está no passado: barrinha âmbar (design, seção 13.9).
    if (secao === "pendentes") return { texto: "Compromisso continua pendente.", tipo: "alerta" };
    // [Interpretação do dev] Ex.: tirou o "Me cobrar" e a data continua no
    // passado (ele vai para "Anteriores"). Os requisitos não trazem esse texto.
    return sucesso("Compromisso atualizado.");
  }

  return sucesso("Compromisso atualizado.");
}

function salvarFormulario() {
  // Nova tentativa: o aviso de "não foi possível salvar" da tentativa anterior some.
  erroSalvar.hidden = true;
  if (!validarFormulario()) return;   // nada é salvo e nada é apagado do formulário

  // US17: o que ficou digitado em "Novo item" entra na lista antes de
  // salvar (nada do que foi digitado se perde). Sem aviso: a janela fecha.
  const textoPendente = campoNovoItem.value.trim();
  if (textoPendente !== "" && itensDoFormulario.length < MAXIMO_DE_ITENS) {
    itensDoFormulario.push({ texto: textoPendente, feito: false });
    campoNovoItem.value = "";
    desenharItensDoFormulario();
  }

  const agora = new Date();
  const agoraIso = agora.toISOString();
  const dados = lerCamposDoFormulario();
  const modo = modoDoFormulario;

  // Guardamos uma cópia da lista: se o localStorage recusar, voltamos atrás.
  const listaAntes = compromissos.slice();
  let id;
  let antes = null;
  let depois;

  if (idEmEdicao) {
    // Editar, remarcar ou agendar: troca o compromisso pelo atualizado
    // (mesmo id, mesmo criadoEm). Editar NÃO muda o status (US04): um
    // item "Feito" continua "Feito". A exceção é virar "Sem data": item
    // sem data é sempre "aberto" (seção 3 dos requisitos).
    id = idEmEdicao;
    antes = compromissos.find(function (c) { return c.id === id; });
    const extra = { atualizadoEm: agoraIso };
    if (dados.data === null) {
      extra.status = "aberto";
      extra.concluidoEm = null;
    }
    depois = Object.assign({}, antes, dados, extra);
    compromissos = compromissos.map(function (c) { return c.id === id ? depois : c; });
  } else {
    id = criarId();
    depois = Object.assign({ id: id }, dados, {
      status: "aberto",
      concluidoEm: null,
      criadoEm: agoraIso,
      atualizadoEm: agoraIso
    });
    compromissos.push(depois);
  }

  // Para o foco do Remarcar e do Agendar: de qual lista o item sai e
  // quem vem depois dele nela (antes de a lista ser redesenhada).
  const listaDeOnde = idEmEdicao ? listaQueContem(id) : null;
  const idSeguinte = idEmEdicao ? idDoProximoNaLista(id) : null;

  if (!salvarCompromissos(compromissos)) {
    // localStorage cheio: desfaz na memória e avisa DENTRO da janela, que
    // continua aberta com tudo o que a pessoa digitou (ela pode tentar de novo).
    // O que já estava salvo no navegador continua intacto.
    // O foco fica onde está; o role="alert" faz o leitor de tela ler o aviso.
    // Mostramos no quadro seguinte para o aviso ser lido de novo a cada tentativa
    // (ele acabou de ser escondido no começo desta função).
    compromissos = listaAntes;
    requestAnimationFrame(function () {
      erroSalvar.hidden = false;
      erroSalvar.scrollIntoView({ block: "nearest" });
    });
    return;
  }

  const aviso = avisoDoFormulario(modo, antes, depois, agora);
  desenharLista();
  if (modo === "editar") {
    // Editou: o foco volta para o "Editar" desse compromisso (redesenhado).
    focoDepoisDeFechar = function () { focarCompromisso(id, "editar"); };
  } else if (modo === "remarcar" || modo === "agendar") {
    // A regra da US13: se o item saiu da lista, o foco vai para o próximo
    // dela (ou "Novo compromisso"); se ficou (continua pendente ou sem
    // data), volta para o mesmo botão no card redesenhado.
    focoDepoisDeFechar = function () { focarDepoisDeMudar(id, listaDeOnde, idSeguinte, modo); };
  }
  janelaCompromisso.close();
  mostrarStatus(aviso.texto, aviso.tipo);
}


/* ---------------------------------------------------------
   8b. FORMULÁRIO: HORA DE FIM (US19)
   "Termina às" e "Duração" são duas formas de ver o mesmo valor.
   Quando um muda, o JavaScript preenche o outro na hora. Ao salvar,
   só a duração (em minutos) é guardada.
   --------------------------------------------------------- */

// Opções fixas da Duração. Outro valor aparece em "Outro".
const OPCOES_DE_DURACAO = ["30", "60", "120"];

/* Os minutos digitados em "Outro" da Duração, se forem um inteiro de
   1 a 1439. Senão, null. (Mesmo jeito do minutosDigitados da US12.) */
function duracaoDigitada() {
  const texto = campoDuracaoMin.value.trim();
  if (!/^\d+$/.test(texto)) return null;
  const minutos = Number(texto);
  return duracaoValida(minutos) ? minutos : null;
}

/* A duração que a lista de escolha diz agora, em minutos, ou null
   ("Sem hora de fim", ou "Outro" com os minutos vazios ou inválidos). */
function duracaoEscolhida() {
  if (campoDuracao.value === "") return null;
  if (campoDuracao.value === "outro") return duracaoDigitada();
  return Number(campoDuracao.value);
}

/* A Hora do formulário em minutos desde 00:00, ou null sem hora. */
function inicioNoFormulario() {
  const texto = campoHora.value.slice(0, 5);
  return !campoSemData.checked && horaValida(texto) ? minutosDoDia(texto) : null;
}

/* "Termina às" em minutos, ou null se estiver vazio. */
function fimNoFormulario() {
  const texto = campoFim.value.slice(0, 5);
  return horaValida(texto) ? minutosDoDia(texto) : null;
}

/* O "acender" em âmbar do campo que o JavaScript mudou sozinho (enfeite,
   design 14.3.2). Tirar a classe, ler offsetWidth e pôr de novo faz a
   animação recomeçar mesmo se ela ainda estiver rodando. */
function acenderCampo(campo) {
  campo.classList.remove("ajustado");
  void campo.offsetWidth;   // obriga o navegador a "notar" que a classe saiu
  campo.classList.add("ajustado");
}
[campoFim, campoDuracao, campoDuracaoMin].forEach(function (campo) {
  campo.addEventListener("animationend", function () { campo.classList.remove("ajustado"); });
});

/* Põe uma duração na lista de escolha: null = "Sem hora de fim";
   30, 60 ou 120 = a opção; outro número = "Outro" com os minutos. */
function escolherDuracao(minutos) {
  let valor = "";
  if (minutos !== null) {
    valor = OPCOES_DE_DURACAO.includes(String(minutos)) ? String(minutos) : "outro";
  }
  const minutosTexto = valor === "outro" ? String(minutos) : "";
  if (campoDuracao.value !== valor) acenderCampo(campoDuracao);
  if (valor === "outro" && campoDuracaoMin.value !== minutosTexto) acenderCampo(campoDuracaoMin);
  campoDuracao.value = valor;
  campoDuracaoMin.value = minutosTexto;
  blocoDuracaoMin.hidden = valor !== "outro";
}

/* Escreve "Termina às" (minutos desde 00:00, ou null para vazio). */
function escreverFim(minutos) {
  const texto = minutos === null ? "" : horaDosMinutos(minutos);
  if (campoFim.value.slice(0, 5) !== texto) {
    campoFim.value = texto;
    acenderCampo(campoFim);
  }
}

/* Mudou "Termina às": a Duração vira a diferença. Fim vazio, igual ou
   antes da Hora: "Sem hora de fim". */
function aoMudarFim() {
  const inicio = inicioNoFormulario();
  if (inicio === null) return;
  const fim = fimNoFormulario();
  escolherDuracao(fim !== null && fim > inicio ? fim - inicio : null);
  esconderErrosResolvidos();
}

/* Mudou a Duração (ou os minutos de "Outro"): "Termina às" = Hora +
   duração. Sem duração, ou passando de 23:59, "Termina às" fica vazio. */
function aoMudarDuracao() {
  const outro = campoDuracao.value === "outro";
  blocoDuracaoMin.hidden = !outro;
  // Fora de "Outro", o número escondido não vale mais: o campo fica limpo.
  if (!outro) campoDuracaoMin.value = "";
  const inicio = inicioNoFormulario();
  if (inicio === null) return;
  const duracao = duracaoEscolhida();
  const fim = duracao === null ? null : inicio + duracao;
  escreverFim(fim !== null && fim <= ULTIMO_MINUTO_DO_DIA ? fim : null);
  esconderErrosResolvidos();
}

/* Mudou a Hora (e continua com hora): a duração fica e "Termina às" é
   recalculado. [Decisão do dev] Se a Duração está em "Sem hora de fim"
   mas "Termina às" tem uma hora (ex.: era igual ou antes da Hora antiga),
   a Duração é recalculada a partir dela, para os dois não ficarem
   dizendo coisas diferentes. */
function aoMudarHora() {
  if (inicioNoFormulario() === null) return;   // sem hora: atualizarCamposDependentes limpa
  if (duracaoEscolhida() !== null) {
    aoMudarDuracao();
  } else if (fimNoFormulario() !== null) {
    aoMudarFim();
  }
}

/* Mostra no formulário a duração de um compromisso salvo (ao editar). */
function mostrarDuracaoNoFormulario(hora, duracaoMin) {
  campoDuracao.value = "";
  campoDuracaoMin.value = "";
  campoFim.value = "";
  if (hora === null || duracaoMin === null) return;
  const valor = OPCOES_DE_DURACAO.includes(String(duracaoMin)) ? String(duracaoMin) : "outro";
  campoDuracao.value = valor;
  if (valor === "outro") campoDuracaoMin.value = String(duracaoMin);
  campoFim.value = horaDosMinutos(minutosDoDia(hora) + duracaoMin);
}

/* Decide a duração que vai ser salva (US19, "Ao salvar"). Devolve
   { duracaoMin, erro }. erro = null, "fim", "duracao" ou "minutos":
   o campo com problema. "Termina às" preenchido vale mais que a Duração. */
function avaliarHoraDeFim() {
  const inicio = inicioNoFormulario();
  if (inicio === null) return { duracaoMin: null, erro: null };

  const fim = fimNoFormulario();
  if (fim !== null) {
    if (fim <= inicio) return { duracaoMin: null, erro: "fim" };
    return { duracaoMin: fim - inicio, erro: null };
  }

  if (campoDuracao.value === "") return { duracaoMin: null, erro: null };
  const duracao = duracaoEscolhida();
  if (duracao === null) return { duracaoMin: null, erro: "minutos" };   // "Outro" vazio ou inválido
  if (inicio + duracao > ULTIMO_MINUTO_DO_DIA) return { duracaoMin: null, erro: "duracao" };
  return { duracaoMin: duracao, erro: null };
}

function esconderErrosDoFim() {
  esconderErro(campoFim, erroFim);
  esconderErro(campoDuracao, erroDuracao);
  esconderErro(campoDuracaoMin, erroDuracaoMin);
}

/* Ao corrigir a hora de fim, o erro que estava na tela some (como nos
   outros campos): some todo erro que não é mais o problema de agora.
   Só esconde: os erros só APARECEM ao tentar salvar. */
function esconderErrosResolvidos() {
  const erroAgora = avaliarHoraDeFim().erro;
  if (erroAgora !== "fim") esconderErro(campoFim, erroFim);
  if (erroAgora !== "duracao") esconderErro(campoDuracao, erroDuracao);
  if (erroAgora !== "minutos") esconderErro(campoDuracaoMin, erroDuracaoMin);
}


/* ---------------------------------------------------------
   8c. FORMULÁRIO: "O QUE LEVAR" (US17)
   A lista fica em itensDoFormulario e só vai para o compromisso
   ao Salvar.
   --------------------------------------------------------- */

/* Anuncia para o leitor de tela, sem tirar o foco do lugar.
   Esvazia e escreve no quadro seguinte: assim a mesma frase duas
   vezes seguidas também é lida (mesmo jeito do mostrarStatus). */
function anunciarNoFormulario(texto) {
  avisoItens.textContent = "";
  requestAnimationFrame(function () { avisoItens.textContent = texto; });
}

/* Desenha a lista do formulário e liga ou desliga o limite de 20. */
function desenharItensDoFormulario() {
  listaItensForm.replaceChildren();
  itensDoFormulario.forEach(function (item, indice) {
    const li = criarElemento("li", "item-form" + (item.feito ? " item-form--marcado" : ""));
    const texto = criarElemento("span", "item-form-texto", item.texto);
    // Marcado no card: riscado aqui e "(já marcado)" para o leitor de tela.
    if (item.feito) texto.appendChild(criarElemento("span", "sr-only", " (já marcado)"));
    li.appendChild(texto);

    const remover = criarElemento("button", "botao-item botao-item--perigo");
    remover.type = "button";
    remover.dataset.acao = "remover-item";
    remover.dataset.indice = String(indice);
    remover.append(criarIcone("remover"), "Remover", criarElemento("span", "sr-only", " " + item.texto));
    li.appendChild(remover);
    listaItensForm.appendChild(li);
  });

  // Com 20 itens: o campo fica "indisponível" (aria-disabled + readonly,
  // continua focável: design 14.6) e o botão fica desativado de verdade.
  const cheio = itensDoFormulario.length >= MAXIMO_DE_ITENS;
  dicaItensLimite.hidden = !cheio;
  botaoAdicionar.disabled = cheio;
  campoNovoItem.readOnly = cheio;
  if (cheio) {
    campoNovoItem.setAttribute("aria-disabled", "true");
    campoNovoItem.setAttribute("aria-describedby", "dica-itens-limite");
  } else {
    campoNovoItem.removeAttribute("aria-disabled");
    campoNovoItem.removeAttribute("aria-describedby");
  }
}

/* "Adicionar" (botão ou Enter no campo). Campo vazio ou só com espaços:
   não faz nada. O foco fica (ou vai) no campo "Novo item". */
function adicionarItem() {
  const texto = campoNovoItem.value.trim();
  campoNovoItem.focus();
  if (texto === "" || itensDoFormulario.length >= MAXIMO_DE_ITENS) return;
  itensDoFormulario.push({ texto: texto, feito: false });
  campoNovoItem.value = "";
  desenharItensDoFormulario();
  anunciarNoFormulario(texto + " adicionado.");
}

/* "Remover": o foco vai para o "Remover" do próximo item (que passa a
   ter o mesmo número) ou, se era o último, para o campo "Novo item". */
function removerItem(indice) {
  const removido = itensDoFormulario[indice];
  if (!removido) return;
  itensDoFormulario.splice(indice, 1);
  desenharItensDoFormulario();
  const proximo = listaItensForm.querySelector('[data-indice="' + indice + '"]');
  (proximo || campoNovoItem).focus();
  anunciarNoFormulario(removido.texto + " removido.");
}


/* ---------------------------------------------------------
   9c. MARCAR O CHECKLIST NO CARD (US18)
   --------------------------------------------------------- */

/* Abre ou fecha a lista "O que levar" de um card. O foco fica no botão. */
function alternarChecklist(botao, compromisso) {
  const abrir = botao.getAttribute("aria-expanded") !== "true";
  botao.setAttribute("aria-expanded", String(abrir));
  document.getElementById(botao.getAttribute("aria-controls")).hidden = !abrir;
  if (abrir) checklistsAbertos.add(compromisso.id); else checklistsAbertos.delete(compromisso.id);
}

/* Marcou ou desmarcou uma caixa: grava na hora. Não redesenha a lista
   (o foco continua na caixa): troca só o texto do botão. Sem aviso
   flutuante: o leitor de tela já diz "marcado" ou "desmarcado". */
function marcarItemDoChecklist(caixa) {
  const item = caixa.closest(".compromisso");
  const compromisso = compromissos.find(function (c) { return c.id === item.dataset.id; });
  const indice = Number(caixa.dataset.indice);
  if (!compromisso || !compromisso.itens[indice]) return;

  const listaAntes = compromissos;
  // Um compromisso novo (Object.assign) com uma lista de itens nova: a
  // lista antiga fica intacta para voltar atrás se a gravação falhar.
  const atualizado = Object.assign({}, compromisso, {
    itens: compromisso.itens.map(function (it, i) {
      return i === indice ? { texto: it.texto, feito: caixa.checked } : it;
    }),
    atualizadoEm: new Date().toISOString()
  });
  compromissos = compromissos.map(function (c) { return c.id === compromisso.id ? atualizado : c; });

  // salvarCompromissos também grava "agenda:ultima-mudanca" (US10).
  if (!salvarCompromissos(compromissos)) {
    compromissos = listaAntes;
    caixa.checked = !caixa.checked;   // a caixa volta ao que era
    mostrarStatus("Não foi possível salvar o compromisso.", "erro");
    return;
  }
  preencherBotaoDoChecklist(item.querySelector(".checklist-botao"), atualizado);
}


/* ---------------------------------------------------------
   9. EXCLUIR (com confirmação)
   --------------------------------------------------------- */
function abrirConfirmacao(compromisso, botao) {
  botaoQueAbriu = botao;
  focoDepoisDeFechar = null;
  idParaExcluir = compromisso.id;
  // Com o texto de baixo, forma a frase da US05:
  // "Excluir 'Dentista'? Essa ação não pode ser desfeita."
  tituloExcluir.textContent = "Excluir '" + compromisso.titulo + "'?";
  janelaExcluir.showModal();
  // O foco começa no "Cancelar", a opção mais segura.
  janelaExcluir.querySelector('[data-acao="cancelar"]').focus();
}

function confirmarExclusao() {
  const id = idParaExcluir;
  // Vale dentro de cada seção: o próximo da MESMA lista (US05, 2b).
  const idSeguinte = idDoProximoNaLista(id);
  const listaAntes = compromissos;

  compromissos = compromissos.filter(function (c) { return c.id !== id; });
  if (!salvarCompromissos(compromissos)) {
    compromissos = listaAntes;
    janelaExcluir.close();
    mostrarFaixa("erro", "Não foi possível salvar o compromisso.");
    return;
  }

  desenharLista();
  focoDepoisDeFechar = function () {
    if (idSeguinte) {
      focarCompromisso(idSeguinte, "item");
    } else {
      botaoNovo.focus();   // não sobrou ninguém depois dele
    }
  };
  janelaExcluir.close();
  mostrarStatus("Compromisso excluído.");
}


/* ---------------------------------------------------------
   9b. FEITO, NÃO VOU FAZER E DESFAZER (US13 e US15)
   Sem confirmação: tudo pode ser desfeito.
   --------------------------------------------------------- */

/* Muda a situação de um compromisso e salva na hora.
   mudancas = os campos que mudam (status e concluidoEm). */
function mudarSituacao(compromisso, mudancas, mensagem) {
  const id = compromisso.id;
  const listaDeOnde = listaQueContem(id);
  const idSeguinte = idDoProximoNaLista(id);
  const listaAntes = compromissos;

  // atualizadoEm também muda: assim o "Juntar" da importação (US09)
  // sabe qual é a versão mais nova do compromisso.
  const agoraIso = new Date().toISOString();
  compromissos = compromissos.map(function (c) {
    return c.id === id ? Object.assign({}, c, mudancas, { atualizadoEm: agoraIso }) : c;
  });

  if (!salvarCompromissos(compromissos)) {
    // localStorage cheio: nada muda (nem na tela) e a faixa avisa.
    compromissos = listaAntes;
    mostrarFaixa("erro", "Não foi possível salvar o compromisso.");
    return;
  }

  desenharLista();
  // Se o item continuou na mesma lista, o foco vai para a ação nova
  // do card ("Desfazer" depois de "Feito", e "Feito" depois de "Desfazer").
  focarDepoisDeMudar(id, listaDeOnde, idSeguinte, mudancas.status === "aberto" ? "feito" : "desfazer");
  mostrarStatus(mensagem);
}

function marcarFeito(compromisso) {
  mudarSituacao(compromisso, { status: "feito", concluidoEm: new Date().toISOString() }, "Marcado como feito.");
}

function marcarNaoVouFazer(compromisso) {
  mudarSituacao(compromisso, { status: "nao-vou-fazer", concluidoEm: new Date().toISOString() }, "Marcado como 'Não vou fazer'.");
}

function desfazer(compromisso) {
  mudarSituacao(compromisso, { status: "aberto", concluidoEm: null }, "Desfeito.");
}


/* ---------------------------------------------------------
   10. SEUS DADOS: BAIXAR CÓPIA (US08)
   Regra dos avisos da Entrega 2a: com a janela "Seus dados" aberta,
   os avisos aparecem DENTRO dela (#dados-aviso). O aviso flutuante
   ficaria atrás da janela, numa parte "inerte" da página, e o leitor
   de tela poderia não ler. Com as janelas fechadas, vale o flutuante.
   --------------------------------------------------------- */

/* Placa "Última cópia": a data (DD/MM/AAAA) ou a frase de "nenhuma cópia". */
function atualizarPlacaDaCopia() {
  const temCopia = ultimoBackup !== null;
  placaComData.hidden = !temCopia;
  placaNunca.hidden = temCopia;
  if (temCopia) {
    placaValor.textContent = dataComAno(ultimoBackup);
    placaValor.dateTime = dataHoraParaAtributo(ultimoBackup);
  }
}

function abrirJanelaDados() {
  avisoDados.replaceChildren();   // a região de avisos começa vazia toda vez
  atualizarPlacaDaCopia();
  janelaDados.showModal();
  botaoBaixar.focus();            // a ação mais comum, e nada aqui apaga dados
}

/* Aviso dentro da janela "Seus dados".
   tipo = "sucesso" (verde, ícone de check), "erro" (vermelho) ou "alerta" (âmbar).
   Um aviso por vez: o novo substitui o anterior. */
function mostrarAvisoNaJanela(tipo, texto) {
  const aviso = criarElemento("p", "faixa faixa--" + tipo);
  aviso.appendChild(criarIcone(tipo === "sucesso" ? "check" : "alerta"));
  aviso.appendChild(criarElemento("span", null, texto));
  // Como no aviso flutuante: esvazia agora e escreve no quadro seguinte,
  // para o leitor de tela ler de novo mesmo se a frase for a mesma.
  avisoDados.replaceChildren();
  requestAnimationFrame(function () {
    avisoDados.replaceChildren(aviso);
    aviso.scrollIntoView({ block: "nearest" });
  });
}

/* Faz o navegador baixar um texto como arquivo. Nada vai para a internet:
   - Blob = um "arquivo" criado na memória da página;
   - URL.createObjectURL dá um endereço provisório para ele;
   - um link <a download="nome"> clicado pelo código inicia o download.
   O link nem precisa entrar na página (Chrome, Edge e Firefox aceitam). */
function baixarArquivo(nome, texto) {
  // charset=utf-8: os acentos chegam certos no arquivo.
  const arquivo = new Blob([texto], { type: "application/json;charset=utf-8" });
  const endereco = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = endereco;
  link.download = nome;
  link.click();
  // Libera a memória um pouco depois, quando o download já começou.
  setTimeout(function () { URL.revokeObjectURL(endereco); }, 1000);
}

/* Baixa a cópia. É a mesma pela janela "Seus dados" e pela faixa de
   lembrete. Devolve false quando não há compromissos (nenhum arquivo
   é gerado); quem chama decide onde mostrar o aviso. */
function baixarCopia() {
  if (compromissos.length === 0) return false;

  const agora = new Date();
  baixarArquivo(nomeDoArquivoDeCopia(agora), textoDoArquivoDeCopia(compromissos, agora));
  ultimoBackup = agora;
  registrarBackup(agora.toISOString());   // grava em "agenda:ultimo-backup"
  esconderLembrete();                     // a cópia está em dia: a faixa sai
  return true;
}


/* ---------------------------------------------------------
   11. IMPORTAR CÓPIA (US09)
   Caminho: "Importar cópia" -> seletor de arquivos -> conferir o
   arquivo (sem mudar nada) -> janela "Importar cópia" (Juntar ou
   Substituir tudo) -> gravar -> fechar tudo e mostrar o resultado.
   As janelas ficam EMPILHADAS: cada showModal() abre por cima da
   anterior, e o Esc fecha só a de cima.
   --------------------------------------------------------- */

/* Lê e confere o arquivo escolhido.
   "async" permite usar "await": o programa espera o arquivo ser lido
   (isso leva um tempinho) sem travar a página enquanto isso. */
async function importarArquivo(arquivo) {
  avisoDados.replaceChildren();   // aviso antigo (ex.: "Cópia baixada.") sai

  // Erros do arquivo: nada muda, o aviso aparece na janela e o foco
  // fica (ou volta) em "Importar cópia".
  function recusar(texto) {
    mostrarAvisoNaJanela("erro", texto);
    botaoImportar.focus();
  }

  // O tamanho é conferido antes de ler: nem abrimos um arquivo enorme.
  if (arquivo.size > TAMANHO_MAXIMO_COPIA) {
    recusar(ERRO_GRANDE_DEMAIS);
    return;
  }

  let texto;
  try {
    texto = await arquivo.text();
  } catch (erro) {
    recusar(ERRO_NAO_E_COPIA);   // o navegador não conseguiu ler o arquivo
    return;
  }

  // Se a pessoa fechou "Seus dados" enquanto o arquivo era lido, paramos aqui.
  if (!janelaDados.open) return;

  const resultado = lerArquivoDeCopia(texto);
  if (resultado.erro) {
    recusar(resultado.erro);
    return;
  }
  abrirJanelaImportar(resultado);
}

/* Janela "Importar cópia", por cima de "Seus dados".
   Tudo o que vem do arquivo entra com textContent (nunca como HTML). */
function abrirJanelaImportar(copia) {
  copiaParaImportar = copia;
  const naCopia = copia.compromissos.length;
  const aqui = compromissos.length;

  // "Esta cópia tem 12 compromissos." (o número em destaque)
  const linhaCopia = criarElemento("p");
  linhaCopia.append(
    "Esta cópia tem ",
    criarElemento("span", "importar-numero", String(naCopia)),
    naCopia === 1 ? " compromisso." : " compromissos."
  );
  resumoImportar.replaceChildren(linhaCopia);

  // "2 itens com problema foram ignorados." (só se houver ignorados)
  if (copia.ignorados > 0) {
    const linhaIgnorados = criarElemento("p", "importar-ignorados");
    linhaIgnorados.appendChild(criarIcone("alerta"));
    linhaIgnorados.appendChild(criarElemento("span", null, textoIgnorados(copia.ignorados)));
    resumoImportar.appendChild(linhaIgnorados);
  }

  // "Neste navegador há 8 compromissos." (para comparar antes de escolher)
  resumoImportar.appendChild(criarElemento("p", "importar-atual", textoNesteNavegador(aqui)));

  textoOpcaoSubstituir.textContent = textoExplicaSubstituir(aqui, naCopia);

  janelaImportar.showModal();
  botaoJuntar.focus();
}

/* "Juntar": acrescenta os da cópia e mantém os daqui. */
function importarJuntando() {
  const resultado = juntarCompromissos(compromissos, copiaParaImportar.compromissos);
  terminarImportacao(resultado.lista, false, textoResultadoJuntar(resultado.novos, resultado.atualizados));
}

/* "Substituir tudo": pede confirmação, por cima de "Importar cópia". */
function pedirParaSubstituir() {
  const aqui = compromissos.length;

  // [Decisão do chefe para um caso que os requisitos não cobrem]
  // Sem nenhum compromisso neste navegador, nada seria apagado: não há
  // o que confirmar. A cópia é importada direto, com o mesmo fim de uma
  // importação normal (fecha tudo, aviso flutuante, foco em "Seus dados").
  if (aqui === 0) {
    importarSubstituindo();
    return;
  }

  textoSubstituir.textContent = textoConfirmaSubstituir(aqui, copiaParaImportar.compromissos.length);
  janelaSubstituir.showModal();
  // O foco começa no "Cancelar", a opção mais segura.
  janelaSubstituir.querySelector('[data-acao="cancelar"]').focus();
}

/* "Substituir" (confirmado): a lista passa a ser só a da cópia.
   O armazenamento guarda antes a lista atual em
   "agenda:compromissos-antes-da-importacao". */
function importarSubstituindo() {
  const lista = copiaParaImportar.compromissos;
  terminarImportacao(lista, true, textoResultadoSubstituir(lista.length));
}

/* Fim da importação ("Juntar" ou "Substituir"). */
function terminarImportacao(listaNova, substituirTudo, mensagem) {
  if (!gravarImportacao(listaNova, substituirTudo)) {
    // localStorage cheio ou indisponível: nada mudou no que estava salvo
    // (nem na memória, porque a lista "compromissos" não foi trocada).
    // Fecha a escolha e a confirmação, volta para "Seus dados" e avisa lá.
    // (close() numa janela que já está fechada não faz nada.)
    janelaSubstituir.close();
    janelaImportar.close();
    mostrarAvisoNaJanela("erro", "Não foi possível importar a cópia neste navegador.");
    botaoImportar.focus();
    return;
  }

  // Deu certo: a memória recebe a lista nova e a tela é redesenhada.
  compromissos = listaNova;
  desenharLista();

  // Fecha TODAS as janelas ANTES de escrever no aviso flutuante: com
  // uma janela aberta, ele ficaria escondido e talvez não fosse lido.
  janelaSubstituir.close();
  janelaImportar.close();
  janelaDados.close();
  mostrarStatus(mensagem);
  botaoDados.focus();
}


/* ---------------------------------------------------------
   12. LEMBRETE DE CÓPIA (US10)
   A faixa lilás no topo do conteúdo. Aparece ao abrir a página,
   sem roubar o foco e sem animação (quem decide é avaliarLembrete,
   em copia.js).
   --------------------------------------------------------- */

/* Monta a faixa (design, seção 12.7). dias = null quando nunca houve cópia. */
function mostrarLembrete(dias) {
  const faixa = criarElemento("div", "faixa faixa--lembrete");
  faixa.id = "faixa-lembrete";
  faixa.appendChild(criarIcone("historico"));

  const corpo = criarElemento("div", "faixa-corpo");
  // O rótulo em texto separa o lembrete das faixas de problema (não só a cor).
  corpo.appendChild(criarElemento("p", "faixa-rotulo", "Lembrete de cópia"));
  const texto = criarElemento("p", "faixa-texto");
  if (dias === null) {
    texto.textContent = "Você ainda não fez uma cópia dos seus compromissos.";
  } else {
    texto.append("Sua última cópia foi há ", criarElemento("span", "faixa-destaque", dias + " dias"), ".");
  }
  corpo.appendChild(texto);
  corpo.appendChild(criarElemento("p", "faixa-subtexto", "Baixe uma cópia para não perder nada se o navegador for limpo."));
  faixa.appendChild(corpo);

  const acoes = criarElemento("div", "faixa-acoes");
  const baixar = criarElemento("button", "btn btn-primario");
  baixar.type = "button";
  baixar.dataset.acao = "lembrete-baixar";
  baixar.appendChild(criarIcone("baixar"));
  baixar.appendChild(document.createTextNode("Baixar cópia agora"));
  acoes.appendChild(baixar);

  // Nome acessível: "Depois, lembrar daqui a 7 dias" (começa com o texto visível).
  // Usamos aria-label, e não um <span class="sr-only">: o pedaço escondido
  // fica com position: absolute e o navegador põe um espaço antes dele,
  // o que dava "Depois , lembrar..." (espaço antes da vírgula).
  const depois = criarElemento("button", "btn btn-secundario", "Depois");
  depois.type = "button";
  depois.dataset.acao = "lembrete-depois";
  depois.setAttribute("aria-label", "Depois, lembrar daqui a 7 dias");
  acoes.appendChild(depois);
  faixa.appendChild(acoes);

  // Sempre a última faixa: depois das faixas de problema (US07).
  faixas.appendChild(faixa);
}

/* Tira a faixa. Se o foco estava dentro dela, ele iria "para o nada"
   (topo da página): mandamos para o título "Próximos compromissos",
   que é o que vem logo depois. */
function esconderLembrete() {
  const faixa = document.getElementById("faixa-lembrete");
  if (!faixa) return;
  const focoEstavaDentro = faixa.contains(document.activeElement);
  faixa.remove();
  if (focoEstavaDentro) tituloProximos.focus();
}

/* "Baixar cópia agora": o mesmo download da US08, com aviso flutuante
   (aqui não há janela aberta). */
function baixarPeloLembrete() {
  if (baixarCopia()) {
    mostrarStatus("Cópia baixada.");
  } else {
    // Não acontece na prática (sem compromissos a faixa nem aparece).
    mostrarStatus("Não há compromissos para copiar.", "erro");
  }
}

/* "Depois": esconde a faixa e só deixa ela voltar daqui a 7 dias. */
function adiarPeloLembrete() {
  adiarLembrete(fimDoAdiamento(new Date()).toISOString());
  esconderLembrete();
  mostrarStatus("Lembrete adiado por 7 dias.");
}


/* ---------------------------------------------------------
   13. EVENTOS (o que acontece em cada clique ou tecla)
   --------------------------------------------------------- */

botaoNovo.addEventListener("click", function () {
  abrirFormulario(null, botaoNovo, "novo");
});

/* Um só "ouvinte" para todos os botões da lista ("delegação de eventos"):
   a lista é redesenhada a toda hora, então em vez de ligar um evento em
   cada botão novo, ouvimos o clique na área principal e vemos qual botão foi. */
areaPrincipal.addEventListener("click", function (evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "novo") {
    abrirFormulario(null, botao, "novo");
    return;
  }

  // Botões da faixa de lembrete de cópia (US10)
  if (botao.dataset.acao === "lembrete-baixar") {
    baixarPeloLembrete();
    return;
  }
  if (botao.dataset.acao === "lembrete-depois") {
    adiarPeloLembrete();
    return;
  }

  const item = botao.closest(".compromisso");
  if (!item) return;
  const compromisso = compromissos.find(function (c) { return c.id === item.dataset.id; });
  if (!compromisso) return;

  // Anotamos no botão de qual compromisso ele é: se a lista for redesenhada
  // enquanto a janela está aberta, achamos o botão "novo" do mesmo item.
  botao.dataset.idDoItem = compromisso.id;

  const acao = botao.dataset.acao;
  // Janelas (o mesmo formulário em modos diferentes, e a confirmação)
  if (acao === "editar") abrirFormulario(compromisso, botao, "editar");
  if (acao === "remarcar") abrirFormulario(compromisso, botao, "remarcar");
  if (acao === "agendar") abrirFormulario(compromisso, botao, "agendar");
  if (acao === "excluir") abrirConfirmacao(compromisso, botao);
  // Etapa 2b: mudam na hora, sem janela (US13 e US15)
  if (acao === "feito") marcarFeito(compromisso);
  if (acao === "nao-vou-fazer") marcarNaoVouFazer(compromisso);
  if (acao === "desfazer") desfazer(compromisso);
  // Etapa 3a: abrir e fechar "O que levar" (US18)
  if (acao === "checklist") alternarChecklist(botao, compromisso);
});

/* Etapa 3a (US18): marcar e desmarcar as caixas do checklist. O evento
   "change" acontece no clique, no toque e no Espaço. */
areaPrincipal.addEventListener("change", function (evento) {
  if (evento.target.matches('input[data-acao="marcar-item"]')) {
    marcarItemDoChecklist(evento.target);
  }
});

/* Botões "Anteriores" e "Sem data": abrem e fecham a sua lista. Por serem
   <button>, eles já funcionam com clique, toque, Enter e Espaço. */
function ligarBotaoDeAbrir(botao, lista) {
  botao.addEventListener("click", function () {
    const estavaAberto = botao.getAttribute("aria-expanded") === "true";
    botao.setAttribute("aria-expanded", String(!estavaAberto));
    lista.hidden = estavaAberto;
  });
}
ligarBotaoDeAbrir(botaoAnteriores, listaAnteriores);
ligarBotaoDeAbrir(botaoSemData, listaSemData);

// Salvar: botão "Salvar" ou Enter num campo de uma linha (o form faz o "submit").
formulario.addEventListener("submit", function (evento) {
  evento.preventDefault();   // não recarregar a página
  salvarFormulario();
});

// Ao corrigir o campo, a mensagem de erro some.
campoTitulo.addEventListener("input", function () {
  if (campoTitulo.hasAttribute("aria-invalid") && campoTitulo.value.trim() !== "") {
    esconderErro(campoTitulo, erroTitulo);
  }
});
["input", "change"].forEach(function (tipoDeEvento) {
  campoData.addEventListener(tipoDeEvento, function () {
    if (campoData.hasAttribute("aria-invalid") && dataValida(campoData.value)) {
      esconderErro(campoData, erroData);
    }
  });
});
campoMinutos.addEventListener("input", function () {
  if (campoMinutos.hasAttribute("aria-invalid") && minutosDigitados() !== null) {
    esconderErro(campoMinutos, erroMinutos);
  }
});

// Etapa 2b: campos que ligam e desligam outros (US12, US14 e US16).
campoSemData.addEventListener("change", function () {
  // Desmarcou "Ainda sem data": a Data volta com o dia de hoje (US16).
  if (!campoSemData.checked) campoData.value = hojeEmTexto(new Date());
  atualizarCamposDependentes();
});
["input", "change"].forEach(function (tipoDeEvento) {
  campoHora.addEventListener(tipoDeEvento, atualizarCamposDependentes);
});
opcoesDeSaida.forEach(function (opcao) {
  opcao.addEventListener("change", atualizarCamposDependentes);
});

// Etapa 3a (US19): um campo da hora de fim preenche o outro na hora.
// Depois do atualizarCamposDependentes acima (que limpa tudo sem Hora).
["input", "change"].forEach(function (tipoDeEvento) {
  campoHora.addEventListener(tipoDeEvento, aoMudarHora);
  campoFim.addEventListener(tipoDeEvento, aoMudarFim);
  campoDuracao.addEventListener(tipoDeEvento, aoMudarDuracao);
});
campoDuracaoMin.addEventListener("input", aoMudarDuracao);

// Etapa 3a (US17): checklist do formulário.
botaoAdicionar.addEventListener("click", adicionarItem);
campoNovoItem.addEventListener("keydown", function (evento) {
  // isComposing: Enter que só confirma um acento ou uma palavra do teclado
  // do celular não conta.
  if (evento.key !== "Enter" || evento.isComposing) return;
  // Enter aqui NÃO salva o formulário (exceção à regra da US02).
  evento.preventDefault();
  // Com 20 itens o campo está "indisponível": o Enter é ignorado.
  if (campoNovoItem.getAttribute("aria-disabled") === "true") return;
  adicionarItem();
});
listaItensForm.addEventListener("click", function (evento) {
  const botao = evento.target.closest('button[data-acao="remover-item"]');
  if (botao) removerItem(Number(botao.dataset.indice));
});

// Botões "Cancelar" das duas janelas e "Excluir" da confirmação.
janelaCompromisso.querySelector('[data-acao="cancelar"]').addEventListener("click", function () {
  janelaCompromisso.close();
});
janelaExcluir.querySelector('[data-acao="cancelar"]').addEventListener("click", function () {
  janelaExcluir.close();
});
janelaExcluir.querySelector('[data-acao="confirmar-exclusao"]').addEventListener("click", confirmarExclusao);

// O evento "close" acontece em TODO jeito de fechar (botão, Esc, Salvar):
// é o lugar certo para devolver o foco.
janelaCompromisso.addEventListener("close", function () {
  idEmEdicao = null;
  modoDoFormulario = "novo";
  erroSalvar.hidden = true;   // fechou: o aviso de "não foi possível salvar" some
  devolverFoco();
});
janelaExcluir.addEventListener("close", function () {
  idParaExcluir = null;
  devolverFoco();
});

// Quando a aba volta a ficar visível (o celular "dorme" os relógios das abas
// escondidas), confere na hora se algo mudou.
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) atualizarSeMudou();
});


// --- Etapa 2a: janela "Seus dados" ---
botaoDados.addEventListener("click", abrirJanelaDados);

botaoBaixar.addEventListener("click", function () {
  if (baixarCopia()) {
    atualizarPlacaDaCopia();
    mostrarAvisoNaJanela("sucesso", "Cópia baixada.");
    // O foco fica no próprio botão "Baixar cópia" (não mexemos nele).
  } else {
    mostrarAvisoNaJanela("alerta", "Não há compromissos para copiar.");
  }
});

// "Importar cópia" abre o seletor de arquivos do sistema.
botaoImportar.addEventListener("click", function () {
  campoArquivo.click();
});

// "change" só acontece quando a pessoa ESCOLHE um arquivo. Se ela cancelar
// o seletor, nada acontece (e o foco fica em "Importar cópia").
campoArquivo.addEventListener("change", function () {
  const arquivo = campoArquivo.files[0];
  // Limpa o campo: sem isso, escolher o MESMO arquivo de novo não dispara
  // o "change" (o valor não teria mudado).
  campoArquivo.value = "";
  if (arquivo) importarArquivo(arquivo);
});

janelaDados.querySelector('[data-acao="fechar"]').addEventListener("click", function () {
  janelaDados.close();
});

// --- Etapa 2a: janela "Importar cópia" e confirmação "Substituir tudo?" ---
botaoJuntar.addEventListener("click", importarJuntando);
botaoSubstituirTudo.addEventListener("click", pedirParaSubstituir);
janelaImportar.querySelector('[data-acao="cancelar"]').addEventListener("click", function () {
  janelaImportar.close();
});
janelaSubstituir.querySelector('[data-acao="cancelar"]').addEventListener("click", function () {
  janelaSubstituir.close();
});
janelaSubstituir.querySelector('[data-acao="confirmar-substituir"]').addEventListener("click", importarSubstituindo);

/* Para onde vai o foco quando cada janela fecha (botão, Esc ou fim da
   importação). O evento "close" chega um pouquinho DEPOIS do close():
   no fim da importação, as três janelas já estão fechadas quando os
   eventos chegam. Por isso cada janela só devolve o foco para o botão
   que a abriu se a janela de baixo ainda estiver aberta. */
janelaSubstituir.addEventListener("close", function () {
  if (janelaImportar.open) botaoSubstituirTudo.focus();
});
janelaImportar.addEventListener("close", function () {
  if (janelaDados.open) botaoImportar.focus();
  copiaParaImportar = null;   // a escolha acabou: esquece o arquivo conferido
});
janelaDados.addEventListener("close", function () {
  botaoDados.focus();
});


/* ---------------------------------------------------------
   14. INÍCIO
   --------------------------------------------------------- */
function iniciar() {
  const resultado = carregarCompromissos();
  compromissos = resultado.compromissos;

  if (resultado.problema === "corrompido") {
    mostrarFaixa("alerta", "Não deu para ler os compromissos salvos. Uma cópia foi guardada e a agenda começou vazia.");
  }
  // Etapa 2b (US11): nos dois casos abaixo a agenda funciona na tela,
  // mas não grava nada (gravacaoBloqueada, em armazenamento.js).
  if (resultado.problema === "migracao-falhou") {
    mostrarFaixa("erro", "Não foi possível atualizar seus dados neste navegador. As mudanças não serão salvas.");
  }
  if (resultado.problema === "versao-nova") {
    mostrarFaixa("alerta", "Seus dados são de uma versão mais nova da Agenda. As mudanças não serão salvas.");
  }
  // armazenamentoDisponivel vem de armazenamento.js. Ele também fica false
  // se o dado estava corrompido e nem a cópia de segurança pôde ser gravada.
  if (!armazenamentoDisponivel) {
    mostrarFaixa("alerta", "Não foi possível salvar neste navegador. Seus compromissos vão sumir ao fechar a página.");
  }

  desenharLista();
  agendarProximoMinuto();

  // Etapa 2a: data da última cópia (para a janela "Seus dados") e,
  // se for a hora, a faixa de lembrete. Com o localStorage indisponível
  // a faixa não aparece (não haveria onde guardar a data da cópia).
  ultimoBackup = isoParaData(lerUltimoBackup());
  if (armazenamentoDisponivel) {
    const lembrete = avaliarLembrete(compromissos, lerUltimoBackup(), lerUltimaMudanca(), lerLembreteAdiadoAte(), new Date());
    if (lembrete) mostrarLembrete(lembrete.diasDesdeACopia);
  }
}

iniciar();
