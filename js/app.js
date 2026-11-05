/* =========================================================
   Agenda - app.js
   A parte que conversa com a tela: monta a lista por dia,
   abre o formulário, salva, edita, exclui e mostra avisos.

   Usa as funções de datas.js, armazenamento.js e copia.js,
   que são carregados antes deste arquivo no index.html.
   Etapa 2a: janela "Seus dados" (baixar e importar cópia)
   e faixa de lembrete de cópia (seções 10 a 12).

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
  historico: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'
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

function criarIcone(nome) {
  return criarDeHtmlFixo(
    '<svg class="icone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
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
   --------------------------------------------------------- */

/* Um compromisso (design, seção 6.3). */
function criarItem(compromisso, ehAnterior) {
  const item = criarElemento("li", ehAnterior ? "compromisso compromisso--anterior" : "compromisso");
  item.dataset.id = compromisso.id;
  // tabindex -1: o item pode receber foco pelo código (depois de excluir
  // o vizinho), mas não entra na ordem do Tab.
  item.tabIndex = -1;

  // Placa de hora (ou "Dia todo")
  if (compromisso.hora) {
    const placa = criarElemento("div", "compromisso-hora");
    const tempo = criarElemento("time", null, compromisso.hora);
    tempo.dateTime = compromisso.data + "T" + compromisso.hora;
    placa.appendChild(tempo);
    item.appendChild(placa);
  } else {
    // O texto fica num <span> para o CSS conseguir quebrar em "DIA / TODO".
    const placa = criarElemento("div", "compromisso-hora compromisso-hora--dia-todo");
    placa.appendChild(criarElemento("span", null, "Dia todo"));
    item.appendChild(placa);
  }

  // Texto: título, e local e observação só se estiverem preenchidos.
  const corpo = criarElemento("div", "compromisso-corpo");
  corpo.appendChild(criarElemento("p", "compromisso-titulo", compromisso.titulo));

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

  // Botões. O texto visível é "Editar"/"Excluir"; o título vai escondido
  // (sr-only), então o leitor de tela ouve "Editar Dentista".
  const acoes = criarElemento("div", "compromisso-acoes");
  acoes.appendChild(criarBotaoDoItem("editar", "Editar", compromisso.titulo));
  acoes.appendChild(criarBotaoDoItem("excluir", "Excluir", compromisso.titulo));
  item.appendChild(acoes);

  return item;
}

function criarBotaoDoItem(acao, textoVisivel, titulo) {
  const classe = acao === "excluir" ? "botao-item botao-item--perigo" : "botao-item";
  const botao = criarElemento("button", classe);
  botao.type = "button";
  botao.dataset.acao = acao;
  botao.appendChild(criarIcone(acao));
  botao.appendChild(document.createTextNode(textoVisivel));
  botao.appendChild(criarElemento("span", "sr-only", " " + titulo));
  return botao;
}


/* Um dia com os seus compromissos (design, seção 6.2).
   prefixo = "proximos" ou "anteriores": o mesmo dia (ex.: hoje) pode
   aparecer nas duas listas, e um id não pode se repetir na página. */
function criarDia(grupo, agora, ehAnterior, prefixo) {
  const titulo = tituloDoDia(grupo.data, agora, !ehAnterior);
  const idDoTitulo = prefixo + "-dia-" + grupo.data;

  const secao = criarElemento("section", "dia");
  // Só o "Hoje" da lista principal ganha a cor âmbar.
  if (!ehAnterior && titulo.texto === "Hoje") secao.classList.add("dia--hoje");
  secao.setAttribute("aria-labelledby", idDoTitulo);

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
  secao.appendChild(h3);

  const ul = criarElemento("ul", "compromissos");
  grupo.itens.forEach(function (compromisso) {
    ul.appendChild(criarItem(compromisso, ehAnterior));
  });
  secao.appendChild(ul);
  return secao;
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


/* Separa os compromissos em "por vir" e "anteriores", de acordo com a hora atual. */
function separarPorMomento(agora) {
  const proximos = [];
  const anteriores = [];
  compromissos.forEach(function (compromisso) {
    if (compromissoPassou(compromisso, agora)) {
      anteriores.push(compromisso);
    } else {
      proximos.push(compromisso);
    }
  });
  return { proximos: proximos, anteriores: anteriores };
}


/* Resumo do que a tela mostra: o dia de hoje (para "Amanhã" virar
   "Hoje" depois da meia-noite) + quais compromissos já passaram. */
function calcularResumo(agora) {
  const passados = separarPorMomento(agora).anteriores.map(function (c) { return c.id; });
  return hojeEmTexto(agora) + "|" + passados.sort().join(",");
}


/* Redesenha as duas listas a partir da memória. */
function desenharLista() {
  const agora = new Date();
  const separados = separarPorMomento(agora);

  // Se o foco estava num compromisso, anotamos qual para devolver o foco
  // depois de redesenhar (senão ele "cairia" no topo da página).
  const focoAntes = lembrarFocoNaLista();

  // Lista principal
  listaProximos.replaceChildren();
  if (separados.proximos.length === 0) {
    listaProximos.appendChild(criarVazio());
  } else {
    const dias = criarElemento("div", "dias");
    agruparPorDia(separados.proximos, false).forEach(function (grupo) {
      dias.appendChild(criarDia(grupo, agora, false, "proximos"));
    });
    listaProximos.appendChild(dias);
  }

  // Anteriores: sem nenhum, a seção inteira some (US06).
  // O estado aberto/fechado não muda aqui: só o botão muda isso.
  listaAnteriores.replaceChildren();
  secaoAnteriores.hidden = separados.anteriores.length === 0;
  contagemAnteriores.textContent = "(" + separados.anteriores.length + ")";
  if (separados.anteriores.length > 0) {
    const dias = criarElemento("div", "dias");
    agruparPorDia(separados.anteriores, true).forEach(function (grupo) {
      dias.appendChild(criarDia(grupo, agora, true, "anteriores"));
    });
    listaAnteriores.appendChild(dias);
  }

  resumoDaTela = calcularResumo(agora);

  if (focoAntes) focarCompromisso(focoAntes.id, focoAntes.acao);
}


/* A cada minuto (e quando a aba volta a ficar visível): se algo passou
   ou o dia virou, redesenha. Se nada mudou, deixa a tela quieta. */
function atualizarSeMudou() {
  if (calcularResumo(new Date()) !== resumoDaTela) {
    desenharLista();
  }
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

/* Se o foco está num compromisso, devolve { id, acao }. */
function lembrarFocoNaLista() {
  const ativo = document.activeElement;
  if (!ativo || !areaPrincipal.contains(ativo)) return null;
  const item = ativo.closest(".compromisso");
  if (!item) return null;
  return { id: item.dataset.id, acao: ativo.dataset.acao || "item" };
}

/* Põe o foco num compromisso: no botão pedido ("editar"/"excluir")
   ou no próprio item ("item"). Se ele estiver dentro de "Anteriores"
   fechado, o foco vai para o botão "Anteriores"; se ele não existir
   mais, vai para o botão "Novo compromisso". */
function focarCompromisso(id, acao) {
  const item = areaPrincipal.querySelector('.compromisso[data-id="' + CSS.escape(id) + '"]');
  if (!item) {
    botaoNovo.focus();
    return;
  }
  const alvo = acao === "item" ? item : item.querySelector('[data-acao="' + acao + '"]');
  if (estaVisivel(alvo)) {
    alvo.focus();
  } else if (!secaoAnteriores.hidden) {
    botaoAnteriores.focus();
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
   8. FORMULÁRIO (criar e editar)
   --------------------------------------------------------- */

/* Mostra o erro de um campo: texto visível + aria-invalid + aria-describedby.
   O aria-describedby só é ligado enquanto o erro aparece: alguns navegadores
   leem a descrição mesmo quando o texto está escondido. */
function mostrarErro(campo, erro) {
  erro.hidden = false;
  campo.setAttribute("aria-invalid", "true");
  campo.setAttribute("aria-describedby", erro.id);
}

function esconderErro(campo, erro) {
  erro.hidden = true;
  campo.removeAttribute("aria-invalid");
  campo.removeAttribute("aria-describedby");
}

/* compromisso = null para criar um novo, ou o compromisso a editar. */
function abrirFormulario(compromisso, botao) {
  botaoQueAbriu = botao;
  focoDepoisDeFechar = null;
  formulario.reset();
  erroSalvar.hidden = true;
  esconderErro(campoTitulo, erroTitulo);
  esconderErro(campoData, erroData);

  if (compromisso) {
    idEmEdicao = compromisso.id;
    tituloDaJanela.textContent = "Editar compromisso";
    campoTitulo.value = compromisso.titulo;
    campoData.value = compromisso.data;
    campoHora.value = compromisso.hora || "";
    campoLocal.value = compromisso.local || "";
    campoObs.value = compromisso.observacao || "";
  } else {
    idEmEdicao = null;
    tituloDaJanela.textContent = "Novo compromisso";
    campoData.value = hojeEmTexto(new Date());   // a data já vem com hoje
  }

  // showModal(): abre por cima da página; Esc fecha e o Tab fica preso dentro.
  janelaCompromisso.showModal();
  campoTitulo.focus();
}

/* Confere os campos. Devolve true se está tudo certo. */
function validarFormulario() {
  const tituloOk = campoTitulo.value.trim() !== "";
  // Data vazia ou incompleta: o navegador entrega "" no value.
  const dataOk = dataValida(campoData.value);

  if (tituloOk) esconderErro(campoTitulo, erroTitulo); else mostrarErro(campoTitulo, erroTitulo);
  if (dataOk) esconderErro(campoData, erroData); else mostrarErro(campoData, erroData);

  // O foco vai para o primeiro campo com problema.
  let campoComErro = null;
  if (!tituloOk) {
    campoComErro = campoTitulo;
  } else if (!dataOk) {
    campoComErro = campoData;
  }
  if (campoComErro) {
    campoComErro.focus();
    // O focus() rola a janela só até a borda do campo: no celular, com o
    // formulário rolado até o fim, o rótulo ficava escondido lá em cima.
    // Por isso rolamos o bloco inteiro (.campo = rótulo + campo + mensagem)
    // para dentro da tela. "nearest" = rola o mínimo necessário.
    campoComErro.closest(".campo").scrollIntoView({ block: "nearest" });
  }
  return tituloOk && dataOk;
}

function salvarFormulario() {
  // Nova tentativa: o aviso de "não foi possível salvar" da tentativa anterior some.
  erroSalvar.hidden = true;
  if (!validarFormulario()) return;   // nada é salvo e nada é apagado do formulário

  const agoraIso = new Date().toISOString();
  // O campo de hora entrega "HH:MM" (às vezes com segundos: cortamos em 5 letras).
  const hora = campoHora.value ? campoHora.value.slice(0, 5) : null;
  const dados = {
    titulo: campoTitulo.value.trim(),
    data: campoData.value,
    hora: horaValida(hora) ? hora : null,          // sem hora = dia todo
    local: textoOuNulo(campoLocal.value, 100),     // vazio vira null
    observacao: textoOuNulo(campoObs.value, 500)
  };

  // Guardamos uma cópia da lista: se o localStorage recusar, voltamos atrás.
  const listaAntes = compromissos.slice();
  let id;
  let mensagem;

  if (idEmEdicao) {
    // Editar: troca o compromisso pelo atualizado (mesmo id, mesmo criadoEm).
    id = idEmEdicao;
    compromissos = compromissos.map(function (c) {
      if (c.id !== id) return c;
      return Object.assign({}, c, dados, { atualizadoEm: agoraIso });
    });
    mensagem = "Compromisso atualizado.";
  } else {
    id = criarId();
    const novo = Object.assign({ id: id }, dados, { criadoEm: agoraIso, atualizadoEm: agoraIso });
    compromissos.push(novo);
    // Data ou hora no passado é permitido: ele vai direto para "Anteriores".
    mensagem = compromissoPassou(novo, new Date()) ? "Compromisso salvo em Anteriores." : "Compromisso salvo.";
  }

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

  desenharLista();
  if (idEmEdicao) {
    // Editou: o foco volta para o "Editar" desse compromisso (redesenhado).
    focoDepoisDeFechar = function () { focarCompromisso(id, "editar"); };
  }
  janelaCompromisso.close();
  mostrarStatus(mensagem);
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

/* Depois de excluir, o foco vai para o próximo compromisso da mesma lista.
   Aqui descobrimos qual é ele, ANTES de apagar. */
function idDoProximoNaLista(id) {
  const lista = listaProximos.querySelector('.compromisso[data-id="' + CSS.escape(id) + '"]') ? listaProximos : listaAnteriores;
  const itens = Array.from(lista.querySelectorAll(".compromisso"));
  const posicao = itens.findIndex(function (item) { return item.dataset.id === id; });
  const proximo = itens[posicao + 1];
  return proximo ? proximo.dataset.id : null;
}

function confirmarExclusao() {
  const id = idParaExcluir;
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
  abrirFormulario(null, botaoNovo);
});

/* Um só "ouvinte" para todos os botões da lista ("delegação de eventos"):
   a lista é redesenhada a toda hora, então em vez de ligar um evento em
   cada botão novo, ouvimos o clique na área principal e vemos qual botão foi. */
areaPrincipal.addEventListener("click", function (evento) {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;

  if (botao.dataset.acao === "novo") {
    abrirFormulario(null, botao);
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

  if (botao.dataset.acao === "editar") abrirFormulario(compromisso, botao);
  if (botao.dataset.acao === "excluir") abrirConfirmacao(compromisso, botao);
});

/* Botão "Anteriores": abre e fecha. Por ser um <button>, ele já funciona
   com clique, toque, Enter e Espaço. */
botaoAnteriores.addEventListener("click", function () {
  const estavaAberto = botaoAnteriores.getAttribute("aria-expanded") === "true";
  botaoAnteriores.setAttribute("aria-expanded", String(!estavaAberto));
  listaAnteriores.hidden = estavaAberto;
});

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
