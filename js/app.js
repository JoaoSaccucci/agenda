/* =========================================================
   Agenda - app.js
   A parte que conversa com a tela: monta a lista por dia,
   abre o formulário, salva, edita, exclui e mostra avisos.

   Usa as funções de datas.js e armazenamento.js, que são
   carregados antes deste arquivo no index.html.

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
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>'
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
  faixas.appendChild(faixa);
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
   10. EVENTOS (o que acontece em cada clique ou tecla)
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


/* ---------------------------------------------------------
   11. INÍCIO
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
}

iniciar();
