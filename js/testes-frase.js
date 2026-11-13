/* =========================================================
   Agenda - testes-frase.js
   Entrega 5 (US36): confere sozinho as 80 frases das tabelas
   "Frases de teste da Entrega 4a" (52) e "Frases de teste da
   Entrega 4b" (28) dos requisitos.

   Os ESPERADOS abaixo foram copiados das tabelas dos requisitos,
   nunca do que o código devolve. Quando uma tabela mudar, esta
   lista muda junto, no mesmo commit.

   Usa só a entenderFrase e a linhaDoEntendi do frase.js. Não lê
   nem grava o localStorage e não envia nada para a internet.
   ========================================================= */


/* ---------------------------------------------------------
   1. O "AGORA" FIXO E OS TEXTOS DOS REQUISITOS
   --------------------------------------------------------- */

// Quinta-feira, 12/11/2026, 14:00, no relógio local. O mês do Date
// começa em 0: 10 = novembro.
const AGORA_FIXO = new Date(2026, 10, 12, 14, 0);

// Textos da dica e dos avisos, como estão nos requisitos (US25, US28, US31).
const DICA_NADA_ENTENDIDO = "Não encontrei data nem hora. Confira os campos.";
const AVISO_MAIS_DE_20 = "A lista 'O que levar' aceita até 20 itens. Os outros ficaram de fora.";
function avisoDeData(digitada) {
  return "A data " + digitada + " não existe. Escolha uma data.";
}


/* ---------------------------------------------------------
   2. OS CASOS (copiados das tabelas dos requisitos)
   Cada caso só tem as colunas que a tabela preenche:
   - titulo: "" = (vazio);
   - data: "DD/MM/AAAA" ou null (vazia);
   - hora: "HH:MM" ou null (vazia = dia todo);
   - semData: true ou false (coluna "Sem data");
   - fim: coluna "Fim / Duração", como "11:00 / 1 h" ou
     "vazio / Outro 180"; null = vazio ou desativado;
   - sair: coluna "Tempo para sair", como "30 min" ou "Outro 90";
     null = Nenhum ou desativado;
   - local: texto ou null (vazio);
   - levar: lista de itens ([] = nenhum);
   - linha: a linha "Entendi" inteira; linhaContem: um trecho dela
     (quando a tabela mostra a linha com "...");
   - avisos: a dica e os avisos que aparecem abaixo da linha.
   "vazio", "vazia" e "desativado" contam como "sem valor" (null).
   --------------------------------------------------------- */

const CASOS_4A = [
  { n: 1, frase: "dentista amanhã às 10h", titulo: "Dentista", data: "13/11/2026", hora: "10:00", semData: false, linha: "Entendi: Amanhã · 10:00 · título 'Dentista'" },
  { n: 2, frase: "DENTISTA AMANHA AS 10", titulo: "DENTISTA", data: "13/11/2026", hora: "10:00", semData: false },
  { n: 3, frase: "dentista sexta às 9h", titulo: "Dentista", data: "13/11/2026", hora: "09:00", semData: false, linha: "Entendi: Amanhã · 09:00 · título 'Dentista'" },
  { n: 4, frase: "prova depois de amanhã", titulo: "Prova", data: "14/11/2026", hora: null, semData: false, linha: "Entendi: Sáb, 14/11 · Dia todo · título 'Prova'" },
  { n: 5, frase: "aula quinta 15h", titulo: "Aula", data: "12/11/2026", hora: "15:00", semData: false },
  { n: 6, frase: "aula quinta 10h", titulo: "Aula", data: "19/11/2026", hora: "10:00", semData: false },
  { n: 7, frase: "aula quinta às 14h", titulo: "Aula", data: "12/11/2026", hora: "14:00", semData: false },
  { n: 8, frase: "aula qui", titulo: "Aula", data: "12/11/2026", hora: null, semData: false },
  { n: 9, frase: "feira sáb. 8h", titulo: "Feira", data: "14/11/2026", hora: "08:00", semData: false },
  { n: 10, frase: "jogo sabado 16h", titulo: "Jogo", data: "14/11/2026", hora: "16:00", semData: false },
  { n: 11, frase: "missa dom às 9", titulo: "Missa", data: "15/11/2026", hora: "09:00", semData: false },
  { n: 12, frase: "ter aula de inglês", titulo: "Ter aula de inglês", data: null, hora: null, semData: true, avisos: [DICA_NADA_ENTENDIDO] },
  { n: 13, frase: "academia na ter", titulo: "Academia", data: "17/11/2026", hora: null, semData: false },
  { n: 14, frase: "médico segunda-feira 9h", titulo: "Médico", data: "16/11/2026", hora: "09:00", semData: false },
  { n: 15, frase: "reunião terca 10:30", titulo: "Reunião", data: "17/11/2026", hora: "10:30", semData: false },
  { n: 16, frase: "prova próxima sexta", titulo: "Prova", data: "13/11/2026", hora: null, semData: false },
  { n: 17, frase: "pagar aluguel dia 15", titulo: "Pagar aluguel", data: "15/11/2026", hora: null, semData: false },
  { n: 18, frase: "pagar aluguel dia 5", titulo: "Pagar aluguel", data: "05/12/2026", hora: null, semData: false },
  { n: 19, frase: "pagar luz dia 12", titulo: "Pagar luz", data: "12/11/2026", hora: null, semData: false },
  { n: 20, frase: "pagar luz dia 12 às 9h", titulo: "Pagar luz", data: "12/12/2026", hora: "09:00", semData: false },
  { n: 21, frase: "conta dia 31", titulo: "Conta", data: "31/12/2026", hora: null, semData: false },
  { n: 22, frase: "consulta 20/11", titulo: "Consulta", data: "20/11/2026", hora: null, semData: false },
  { n: 23, frase: "consulta 10/11", titulo: "Consulta", data: "10/11/2027", hora: null, semData: false },
  { n: 24, frase: "formatura 15/11/2027 19h", titulo: "Formatura", data: "15/11/2027", hora: "19:00", semData: false, linha: "Entendi: Seg, 15/11/2027 · 19:00 · título 'Formatura'" },
  { n: 25, frase: "festa 31/02", titulo: "Festa 31/02", data: null, hora: null, semData: false, linha: "Entendi: data a escolher · título 'Festa 31/02'", avisos: [avisoDeData("31/02")] },
  { n: 26, frase: "aniversário 29/02", titulo: "Aniversário", data: "29/02/2028", hora: null, semData: false },
  { n: 27, frase: "comprar 2 pães amanhã", titulo: "Comprar 2 pães", data: "13/11/2026", hora: null, semData: false },
  { n: 28, frase: "aula 3 sexta", titulo: "Aula 3", data: "13/11/2026", hora: null, semData: false },
  { n: 29, frase: "Rua 15 amanhã 10h", titulo: "Rua 15", data: "13/11/2026", hora: "10:00", semData: false },
  { n: 30, frase: "buscar as crianças amanhã", titulo: "Buscar as crianças", data: "13/11/2026", hora: null, semData: false },
  { n: 31, frase: "buscar as 2 crianças amanhã", titulo: "Buscar as 2 crianças", data: "13/11/2026", hora: null, semData: false },
  { n: 32, frase: "aula às 3 com o João", titulo: "Aula com o João", data: "13/11/2026", hora: "03:00", semData: false, linha: "Entendi: Amanhã · 03:00 · título 'Aula com o João'" },
  { n: 33, frase: "almoço ao meio-dia", titulo: "Almoço", data: "13/11/2026", hora: "12:00", semData: false },
  { n: 34, frase: "plantão amanhã à meia noite", titulo: "Plantão", data: "13/11/2026", hora: "00:00", semData: false },
  { n: 35, frase: "jantar sexta 8 da noite", titulo: "Jantar", data: "13/11/2026", hora: "20:00", semData: false },
  { n: 36, frase: "remédio amanhã 7h30 da manhã", titulo: "Remédio", data: "13/11/2026", hora: "07:30", semData: false },
  { n: 37, frase: "café às 3 da tarde amanhã", titulo: "Café", data: "13/11/2026", hora: "15:00", semData: false },
  { n: 38, frase: "festa sábado 2 da noite", titulo: "Festa 2 da noite", data: "14/11/2026", hora: null, semData: false },
  { n: 39, frase: "reunião 16h", titulo: "Reunião", data: "12/11/2026", hora: "16:00", semData: false },
  { n: 40, frase: "reunião amanhã 10h ou sexta 11h", titulo: "Reunião ou sexta 11h", data: "13/11/2026", hora: "10:00", semData: false },
  { n: 41, frase: "comprar pão", titulo: "Comprar pão", data: null, hora: null, semData: true, linha: "Entendi: Ainda sem data · título 'Comprar pão'", avisos: [DICA_NADA_ENTENDIDO] },
  { n: 42, frase: "amanhã 10h", titulo: "", data: "13/11/2026", hora: "10:00", semData: false, linhaContem: " · sem título" },
  { n: 43, frase: "reunião 25h amanhã", titulo: "Reunião 25h", data: "13/11/2026", hora: null, semData: false },
  { n: 44, frase: "prova dia 32", titulo: "Prova dia 32", data: null, hora: null, semData: true, avisos: [DICA_NADA_ENTENDIDO] },
  { n: 45, frase: "Dentista, amanhã, 10h.", titulo: "Dentista", data: "13/11/2026", hora: "10:00", semData: false },
  { n: 46, frase: "pagar boleto até sexta", titulo: "Pagar boleto", data: "13/11/2026", hora: null, semData: false },
  { n: 47, frase: "entregar trabalho para o dia 20", titulo: "Entregar trabalho", data: "20/11/2026", hora: null, semData: false },
  { n: 48, frase: "dentista às 10 horas amanhã", titulo: "Dentista", data: "13/11/2026", hora: "10:00", semData: false },
  { n: 49, frase: "ver o amanhecer sábado", titulo: "Ver o amanhecer", data: "14/11/2026", hora: null, semData: false },
  { n: 50, frase: "<b>oi</b> amanhã", titulo: "<b>oi</b>", data: "13/11/2026", hora: null, semData: false },
  { n: 51, frase: "reunião 14h", titulo: "Reunião", data: "12/11/2026", hora: "14:00", semData: false },
  { n: 52, frase: "plantão meia-noite", titulo: "Plantão", data: "13/11/2026", hora: "00:00", semData: false }
];

// 4b #27: "levar a, b, c, ..." com 22 itens de uma letra, de "a" a "v".
const LETRAS_A_ATE_V = "abcdefghijklmnopqrstuv".split("");

const CASOS_4B = [
  { n: 1, frase: "reunião amanhã das 10h às 11h", titulo: "Reunião", data: "13/11/2026", hora: "10:00", fim: "11:00 / 1 h", sair: null, local: null, levar: [], linhaContem: " · 10:00 · até 11:00 · " },
  { n: 2, frase: "aula sexta das 2 às 4 da tarde", titulo: "Aula", data: "13/11/2026", hora: "14:00", fim: "16:00 / 2 h", sair: null, local: null, levar: [] },
  { n: 3, frase: "prova sábado das 11 às 1 da tarde", titulo: "Prova", data: "14/11/2026", hora: "11:00", fim: "13:00 / 2 h", sair: null, local: null, levar: [] },
  { n: 4, frase: "reunião amanhã das 9h30 até 10h", titulo: "Reunião", data: "13/11/2026", hora: "09:30", fim: "10:00 / 30 min", sair: null, local: null, levar: [] },
  { n: 5, frase: "festa sábado das 22h às 2h", titulo: "Festa", data: "14/11/2026", hora: "22:00", fim: "02:00 / Sem hora de fim", sair: null, local: null, levar: [] },
  { n: 6, frase: "treino amanhã 7h por 1h30", titulo: "Treino", data: "13/11/2026", hora: "07:00", fim: "08:30 / Outro 90", sair: null, local: null, levar: [], linhaContem: " · duração 90 min · " },
  { n: 7, frase: "call hoje 16h por meia hora", titulo: "Call", data: "12/11/2026", hora: "16:00", fim: "16:30 / 30 min", sair: null, local: null, levar: [] },
  { n: 8, frase: "show sábado 22h durante 3 horas", titulo: "Show", data: "14/11/2026", hora: "22:00", fim: "vazio / Outro 180", sair: null, local: null, levar: [] },
  { n: 9, frase: "estudar amanhã por 2 horas", titulo: "Estudar por 2 horas", data: "13/11/2026", hora: null, fim: null, sair: null, local: null, levar: [] },
  { n: 10, frase: "dentista amanhã 10h sair 30 min antes", titulo: "Dentista", data: "13/11/2026", hora: "10:00", fim: null, sair: "30 min", local: null, levar: [] },
  { n: 11, frase: "entrevista sexta 9h sair 1h30 antes", titulo: "Entrevista", data: "13/11/2026", hora: "09:00", fim: null, sair: "Outro 90", local: null, levar: [] },
  { n: 12, frase: "viagem sábado 8h sair 13h antes", titulo: "Viagem", data: "14/11/2026", hora: "08:00", fim: null, sair: "Outro 780", local: null, levar: [] },
  { n: 13, frase: "dentista amanhã sair 30 min antes", titulo: "Dentista sair 30 min antes", data: "13/11/2026", hora: null, fim: null, sair: null, local: null, levar: [] },
  { n: 14, frase: "dentista amanhã 10h levar RG", titulo: "Dentista", data: "13/11/2026", hora: "10:00", fim: null, sair: null, local: null, levar: ["RG"] },
  { n: 15, frase: "exame sexta 7h levar RG, pedido médico e cartão do convênio", titulo: "Exame", data: "13/11/2026", hora: "07:00", fim: null, sair: null, local: null, levar: ["RG", "pedido médico", "cartão do convênio"] },
  { n: 16, frase: "dentista amanhã 10h na clínica Sorriso", titulo: "Dentista", data: "13/11/2026", hora: "10:00", fim: null, sair: null, local: "Clínica Sorriso", levar: [] },
  { n: 17, frase: "almoço na casa da vó sábado meio-dia", titulo: "Almoço", data: "14/11/2026", hora: "12:00", fim: null, sair: null, local: "Casa da vó", levar: [] },
  { n: 18, frase: "reunião na sexta 15h", titulo: "Reunião", data: "13/11/2026", hora: "15:00", fim: null, sair: null, local: null, levar: [] },
  { n: 19, frase: "levar o carro na oficina amanhã", titulo: "Levar o carro", data: "13/11/2026", hora: null, fim: null, sair: null, local: "Oficina", levar: [] },
  { n: 20, frase: "aula amanhã 10h levar caderno na escola", titulo: "Aula", data: "13/11/2026", hora: "10:00", fim: null, sair: null, local: "Escola", levar: ["caderno"] },
  { n: 21, frase: "consulta amanhã 9h na clínica levar RG e exames sair 40 min antes", titulo: "Consulta", data: "13/11/2026", hora: "09:00", fim: null, sair: "Outro 40", local: "Clínica", levar: ["RG", "exames"] },
  { n: 22, frase: "dentista sexta das 9h às 10h no centro levar RG sair 30 min antes", titulo: "Dentista", data: "13/11/2026", hora: "09:00", fim: "10:00 / 1 h", sair: "30 min", local: "Centro", levar: ["RG"], linha: "Entendi: Amanhã · 09:00 · até 10:00 · sair 30 min antes · local 'Centro' · levar 'RG' · título 'Dentista'" },
  { n: 23, frase: "comprar pão levar sacola", titulo: "Comprar pão", data: null, hora: null, semData: true, fim: null, sair: null, local: null, levar: ["sacola"], avisos: [DICA_NADA_ENTENDIDO] },
  { n: 24, frase: "mudança amanhã levar", titulo: "Mudança levar", data: "13/11/2026", hora: null, fim: null, sair: null, local: null, levar: [] },
  { n: 25, frase: "reunião amanhã 10h no escritório no 3º andar", titulo: "Reunião", data: "13/11/2026", hora: "10:00", fim: null, sair: null, local: "Escritório no 3º andar", levar: [] },
  { n: 26, frase: "pensar na vida amanhã", titulo: "Pensar", data: "13/11/2026", hora: null, fim: null, sair: null, local: "Vida", levar: [] },
  { n: 27, frase: "mudança sábado levar " + LETRAS_A_ATE_V.join(", "), titulo: "Mudança", data: "14/11/2026", hora: null, fim: null, sair: null, local: null, levar: LETRAS_A_ATE_V.slice(0, 20), avisos: [AVISO_MAIS_DE_20] },
  { n: 28, frase: "treino das 9h às 10h", titulo: "Treino", data: "13/11/2026", hora: "09:00", fim: "10:00 / 1 h", sair: null, local: null, levar: [] }
];


/* ---------------------------------------------------------
   3. O QUE A entenderFrase DEVOLVEU, NO FORMATO DAS TABELAS
   --------------------------------------------------------- */

/* "2026-11-13" -> "13/11/2026" (como nas tabelas). */
function dataDaTabela(texto) {
  if (!texto) return null;
  const partes = texto.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

/* Minutos -> nome da opção da lista "Duração" (seção 3, "Hora de fim"). */
function opcaoDaDuracao(minutos) {
  if (minutos === 30) return "30 min";
  if (minutos === 60) return "1 h";
  if (minutos === 120) return "2 h";
  return "Outro " + minutos;
}

/* Minutos -> nome da opção do grupo "Tempo para sair" (US30). */
function opcaoDoSair(minutos) {
  if (minutos === null) return null;
  if ([15, 30, 45, 60].includes(minutos)) return minutos + " min";
  return "Outro " + minutos;
}

/* A coluna "Fim / Duração": "Termina às / Duração", como o formulário
   mostra pelas regras da US19 e da US29.
   - Intervalo: fim = o segundo horário. Fim igual ou antes da hora:
     Duração "Sem hora de fim" (com o erro na tela).
   - Duração: "Termina às" = hora + duração; se passar de 23:59 (ou a
     duração estiver fora de 1 a 1439), fica vazio. */
function fimDaTabela(r) {
  if (r.fim) {
    const minutos = minutosDoDia(r.fim) - minutosDoDia(r.hora);
    return r.fim + " / " + (minutos > 0 ? opcaoDaDuracao(minutos) : "Sem hora de fim");
  }
  if (r.duracaoMin !== null) {
    const termina = minutosDoDia(r.hora) + r.duracaoMin;
    const cabe = r.duracaoMin >= 1 && termina <= ULTIMO_MINUTO_DO_DIA;
    return (cabe ? horaDosMinutos(termina) : "vazio") + " / " + opcaoDaDuracao(r.duracaoMin);
  }
  return null;
}

/* A dica e os avisos que aparecem abaixo da linha "Entendi" (US28 e
   US31). A dica de "nada entendido" não aparece junto do aviso de data. */
function avisosDaTabela(r) {
  const avisos = [];
  if (r.nadaEntendido && !r.dataInexistente) avisos.push(DICA_NADA_ENTENDIDO);
  if (r.dataInexistente) avisos.push(avisoDeData(r.dataInexistente));
  if (r.itensDeFora > 0) avisos.push(AVISO_MAIS_DE_20);
  return avisos;
}

/* Todos os valores, já no formato das tabelas. */
function valoresObtidos(frase) {
  const r = entenderFrase(frase, AGORA_FIXO);
  // A linha usa espaços inseparáveis (design 17.3.1) para não quebrar
  // "até 11:00"; nas tabelas eles são espaços comuns.
  const linha = linhaDoEntendi(r, AGORA_FIXO).replace(/ /g, " ");
  return {
    titulo: r.titulo,
    data: dataDaTabela(r.data),
    hora: r.hora,
    semData: r.semData,
    fim: fimDaTabela(r),
    sair: opcaoDoSair(r.antecedenciaMin),
    local: r.local,
    levar: r.itens,
    linha: linha,
    linhaContem: linha,
    avisos: avisosDaTabela(r)
  };
}


/* ---------------------------------------------------------
   4. COMPARAR
   --------------------------------------------------------- */

// Os campos na ordem em que aparecem na lista de falhas, com o nome.
const CAMPOS = [
  ["titulo", "Título"], ["data", "Data"], ["hora", "Hora"], ["semData", "Sem data"],
  ["fim", "Fim / Duração"], ["sair", "Tempo para sair"], ["local", "Local"],
  ["levar", "O que levar"], ["linha", "Linha \"Entendi\""],
  ["linhaContem", "Linha \"Entendi\" (trecho)"], ["avisos", "Dica e avisos"]
];

/* Um campo bate com o esperado? Texto exato; listas, item por item.
   linhaContem: o trecho precisa estar dentro da linha obtida. */
function bate(campo, esperado, obtido) {
  if (campo === "linhaContem") return obtido.includes(esperado);
  return JSON.stringify(esperado) === JSON.stringify(obtido);
}

/* Roda um caso. Devolve a lista de diferenças ([] = passou).
   Se a função der erro, a frase falha com a mensagem e as outras
   continuam (o try/catch segura o erro). */
function rodarCaso(caso) {
  let obtido;
  try {
    obtido = valoresObtidos(caso.frase);
  } catch (erro) {
    return [{ nome: "Erro", erro: "Erro: " + erro.message }];
  }
  const diferencas = [];
  CAMPOS.forEach(function (campo) {
    const chave = campo[0];
    if (!(chave in caso)) return;   // coluna sem valor na tabela: não confere
    if (!bate(chave, caso[chave], obtido[chave])) {
      diferencas.push({ nome: campo[1], esperado: caso[chave], obtido: obtido[chave] });
    }
  });
  return diferencas;
}


/* ---------------------------------------------------------
   5. MOSTRAR NA PÁGINA (sempre com textContent, nunca HTML:
   a frase #50 da 4a tem "<b>")
   --------------------------------------------------------- */

/* Valor -> texto para a tela. Sem valor: "(vazio)". */
function valorParaTexto(valor) {
  if (valor === null || valor === "" || (Array.isArray(valor) && valor.length === 0)) return "(vazio)";
  if (valor === true) return "sim";
  if (valor === false) return "não";
  if (Array.isArray(valor)) return valor.join("; ");
  return String(valor);
}

/* Cria um elemento com texto. */
function elemento(tag, texto) {
  const el = document.createElement(tag);
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/* "Esperado: " ou "Obtido: " + o valor num <code>. */
function linhaDeValor(rotulo, valor) {
  const dd = elemento("dd", rotulo + ": ");
  dd.appendChild(elemento("code", valorParaTexto(valor)));
  return dd;
}

function mostrarFalha(lista, nome, caso, diferencas) {
  const li = elemento("li");
  li.className = "falha";
  li.appendChild(elemento("h3", "Falhou: " + nome));
  const p = elemento("p", "Frase: ");
  p.appendChild(elemento("code", caso.frase));
  li.appendChild(p);
  const dl = elemento("dl");
  diferencas.forEach(function (d) {
    dl.appendChild(elemento("dt", d.nome));
    if (d.erro) {
      dl.appendChild(elemento("dd", d.erro));
    } else {
      dl.appendChild(linhaDeValor("Esperado", d.esperado));
      dl.appendChild(linhaDeValor("Obtido", d.obtido));
    }
  });
  li.appendChild(dl);
  lista.appendChild(li);
}

function mostrarPassou(lista, nome, caso) {
  const li = elemento("li", nome + " ");
  li.appendChild(elemento("code", caso.frase));
  lista.appendChild(li);
}

function rodarTodos() {
  const todos = [];
  CASOS_4A.forEach(function (caso) { todos.push({ nome: "4a #" + caso.n, caso: caso }); });
  CASOS_4B.forEach(function (caso) { todos.push({ nome: "4b #" + caso.n, caso: caso }); });

  const listaFalhas = elemento("ol");
  listaFalhas.className = "falhas";
  const listaPassaram = document.getElementById("passaram");
  let passaram = 0;

  todos.forEach(function (item) {
    const diferencas = rodarCaso(item.caso);
    if (diferencas.length === 0) {
      passaram++;
      mostrarPassou(listaPassaram, item.nome, item.caso);
    } else {
      mostrarFalha(listaFalhas, item.nome, item.caso, diferencas);
    }
  });

  const falharam = todos.length - passaram;
  let resumo = passaram + " de " + todos.length + " frases passaram.";
  if (falharam > 0) resumo += " " + falharam + (falharam === 1 ? " falhou." : " falharam.");
  document.getElementById("resumo").textContent = resumo;

  const areaFalhas = document.getElementById("falhas");
  areaFalhas.appendChild(falharam > 0 ? listaFalhas : elemento("p", "Nenhuma falha."));
  document.getElementById("titulo-passaram").textContent = "Passaram (" + passaram + ")";
}

rodarTodos();
