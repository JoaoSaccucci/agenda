/* =========================================================
   Agenda - frase.js
   Etapa 4a (US24 a US28): "Criar por frase".

   Lê uma frase como "dentista amanhã às 10h" e devolve o que
   foi entendido: título, data e hora. Não mexe na tela nem no
   localStorage (como o datas.js): só recebe a frase e o "agora"
   e devolve um objeto. Por isso dá para conferir no console:

     entenderFrase("dentista amanhã às 10h", new Date(2026, 10, 12, 14, 0))
     -> { titulo: "Dentista", data: "2026-11-13", hora: "10:00", ... }

   Tudo é feito com expressões regulares e funções próprias,
   sem biblioteca e sem internet. As regras estão nos requisitos,
   seção 3, "Captura rápida (Etapa 4)".

   Usa funções de datas.js (carregado antes deste arquivo).
   ========================================================= */


/* ---------------------------------------------------------
   1. PREPARAR A FRASE
   --------------------------------------------------------- */

/* Deixa a frase pronta para comparar: minúsculas e sem acento
   ("AMANHÃ" -> "amanha"), com o MESMO TAMANHO da original, letra por
   letra. Assim a posição de um pedaço na frase preparada é a mesma na
   frase original, e o título fica com o texto como a pessoa digitou.
   normalize("NFD") separa a letra do acento ("ã" -> "a" + "~") e o
   replace tira o acento. Se alguma letra virar mais de uma (raro),
   ela fica como está, para o tamanho não mudar. */
function prepararFrase(frase) {
  let preparada = "";
  for (let i = 0; i < frase.length; i++) {
    const letra = frase[i];
    let simples = letra.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (simples.length !== 1) simples = letra;
    preparada += simples;
  }
  return preparada;
}

// Letras e números da frase preparada (sem acento, minúsculas).
const LETRA_OU_NUMERO = /[a-z0-9]/;

/* Um pedaço só pode começar no começo de uma palavra ("amanhã" não é
   achado dentro de "amanhecer"). Um número também não pode vir logo
   depois de "/" ou ":" (o "11" de "15/11" não é lido sozinho). */
function comecoDePalavra(texto, posicao) {
  if (!LETRA_OU_NUMERO.test(texto[posicao] || "")) return false;
  if (posicao === 0) return true;
  const antes = texto[posicao - 1];
  if (LETRA_OU_NUMERO.test(antes)) return false;
  if (/\d/.test(texto[posicao]) && (antes === "/" || antes === ":")) return false;
  return true;
}

/* Pula os espaços a partir de uma posição. */
function pularEspacos(texto, posicao) {
  while (posicao < texto.length && /\s/.test(texto[posicao])) posicao++;
  return posicao;
}

// Fim de palavra: depois do pedaço não pode vir letra nem número, nem
// "/número" ou ":número" (assim "15/11/27" não vira "15/11" + resto).
const FIM_DE_PALAVRA = "(?![a-z0-9]|[/:]\\d)";


/* ---------------------------------------------------------
   2. DATAS (US25)
   --------------------------------------------------------- */

// Palavras de ligação que saem junto com a data (no máximo uma, colada
// nela). As mais compridas vêm antes: "na proxima" antes de "na".
const LIGACOES_DE_DATA = [
  "na proxima", "no proximo", "para o", "pra o", "ate o", "para a", "ate a",
  "nesta", "neste", "esta", "este", "proxima", "proximo",
  "no", "na", "em", "para", "pra", "ate"
];

// Uma expressão só para todas as datas. Os grupos (os parênteses) dizem
// qual forma foi achada. "y" (sticky) = só procura NA posição pedida.
const EXPRESSAO_DATA = new RegExp(
  "(?:(" + LIGACOES_DE_DATA.join("|") + ")\\s+)?" +                // 1: ligação
  "(?:" +
    "(depois\\s+de\\s+amanha|amanha|hoje)" +                         // 2: relativa
    "|(segunda|terca|quarta|quinta|sexta)(?:[-\\s]feira)?" +         // 3: dia útil por extenso
    "|(sabado|domingo)" +                                            // 4: fim de semana por extenso
    "|(seg|ter|qua|qui|sex|sab|dom)\\.?" +                           // 5: abreviado (com ou sem ponto)
    "|dia\\s+(\\d{1,2})(?:/(\\d{1,2})(?:/(\\d{4}))?)?" +             // 6, 7, 8: "dia 15" ou "dia 15/11"
    "|(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}))?" +                         // 9, 10, 11: "15/11" ou "15/11/2027"
  ")" + FIM_DE_PALAVRA,
  "y"
);

// Número do dia da semana, como o getDay() do JavaScript (domingo = 0).
const NUMERO_DO_DIA = {
  domingo: 0, dom: 0, segunda: 1, seg: 1, terca: 2, ter: 2, quarta: 3, qua: 3,
  quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, sab: 6
};

// "hoje" = 0 dias a partir de hoje, "amanhã" = 1, "depois de amanhã" = 2.
const DIAS_A_SOMAR = { hoje: 0, amanha: 1, "depois de amanha": 2 };

/* Quantos dias tem o mês (mes de 1 a 12) num ano. O dia 0 do mês
   seguinte é o último dia deste mês. setFullYear aceita qualquer ano
   (o new Date(ano, ...) troca anos de 0 a 99 por 1900 a 1999). */
function diasNoMes(ano, mes) {
  const data = new Date(2000, 0, 1);
  data.setFullYear(ano, mes, 0);
  return data.getDate();
}

/* "AAAA-MM-DD" montado à mão (funciona com qualquer ano de 4 dígitos). */
function textoDaData(ano, mes, dia) {
  return String(ano).padStart(4, "0") + "-" + doisDigitos(mes) + "-" + doisDigitos(dia);
}

/* Procura uma data começando exatamente na posição. Devolve o pedaço
   ou null. "contexto" dá acesso à busca de horas (regra da D2). */
function dataEm(contexto, posicao) {
  const texto = contexto.texto;
  EXPRESSAO_DATA.lastIndex = posicao;
  const achado = EXPRESSAO_DATA.exec(texto);
  if (!achado) return null;

  const peca = { tipo: "data", inicio: posicao, fim: posicao + achado[0].length, existe: true };

  if (achado[2]) {
    peca.forma = "relativa";
    peca.somar = DIAS_A_SOMAR[achado[2].replace(/\s+/g, " ")];
  } else if (achado[3] || achado[4] || achado[5]) {
    const nome = achado[3] || achado[4] || achado[5];
    // D2: "ter" e "dom" também são palavras comuns ("ter aula"). Só contam
    // com uma ligação antes ("na ter") ou com uma hora logo depois ("ter 10h").
    if ((nome === "ter" || nome === "dom") && !achado[1]) {
      if (!horaEm(contexto, pularEspacos(texto, peca.fim))) return null;
    }
    peca.forma = "semana";
    peca.diaDaSemana = NUMERO_DO_DIA[nome];
  } else if (achado[6] && !achado[7]) {
    // "dia 15": só de 1 a 31. "dia 32" não é data e fica no título, sem aviso.
    const dia = Number(achado[6]);
    if (dia < 1 || dia > 31) return null;
    peca.forma = "dia";
    peca.dia = dia;
  } else {
    // "15/11", "15/11/2027" (com ou sem "dia" antes).
    const dia = Number(achado[6] || achado[9]);
    const mes = Number(achado[7] || achado[10]);
    const textoAno = achado[8] || achado[11];
    peca.forma = "dia-mes";
    peca.dia = dia;
    peca.mes = mes;
    peca.ano = textoAno ? Number(textoAno) : null;
    // A data como foi digitada, para o aviso "A data 31/02 não existe."
    // (os algarismos são iguais na frase original e na preparada).
    peca.digitada = (achado[6] || achado[9]) + "/" + (achado[7] || achado[10]) + (textoAno ? "/" + textoAno : "");
    // Sem ano, vale o maior mês possível (fevereiro com 29): "29/02" existe.
    const ultimoDia = mes >= 1 && mes <= 12 ? diasNoMes(peca.ano !== null ? peca.ano : 2000, mes) : 0;
    peca.existe = dia >= 1 && dia <= ultimoDia;
  }
  return peca;
}

/* Transforma o pedaço de data em "AAAA-MM-DD", sempre a próxima no
   futuro (requisitos, seção 3). "hora" é a hora entendida ("HH:MM" ou
   null): ela decide se a data de hoje já passou (regra "quando um
   compromisso passou", compromissoPassou de datas.js). */
function resolverData(peca, hora, agora) {
  const passou = function (data) { return compromissoPassou({ data: data, hora: hora }, agora); };
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const dia = agora.getDate();

  if (peca.forma === "relativa") {
    // Usada como está, mesmo se já passou ("hoje 8h" às 14:00 é hoje).
    return dataParaTexto(new Date(ano, mes - 1, dia + peca.somar));
  }

  if (peca.forma === "semana") {
    // O primeiro dia com esse nome a partir de hoje. Se for hoje e já
    // passou, o da semana seguinte (por isso o laço vai até 7).
    for (let somar = 0; somar <= 7; somar++) {
      const data = new Date(ano, mes - 1, dia + somar);
      if (data.getDay() === peca.diaDaSemana && !passou(dataParaTexto(data))) {
        return dataParaTexto(data);
      }
    }
  }

  if (peca.forma === "dia") {
    // Neste mês, se ainda não passou; senão, no mês seguinte. Mês sem
    // esse dia (31 em novembro) pula para o próximo que tem.
    for (let somar = 0; somar <= 24; somar++) {
      const primeiro = new Date(ano, mes - 1 + somar, 1);
      const a = primeiro.getFullYear();
      const m = primeiro.getMonth() + 1;
      if (peca.dia <= diasNoMes(a, m) && !passou(textoDaData(a, m, peca.dia))) {
        return textoDaData(a, m, peca.dia);
      }
    }
  }

  if (peca.forma === "dia-mes") {
    // Com ano: usada como está, mesmo no passado.
    if (peca.ano !== null) return textoDaData(peca.ano, peca.mes, peca.dia);
    // Sem ano: neste ano, se ainda não passou; senão, no ano seguinte.
    // "29/02" procura o próximo ano bissexto (no máximo 8 anos à frente).
    for (let somar = 0; somar <= 8; somar++) {
      const a = ano + somar;
      if (peca.dia <= diasNoMes(a, peca.mes) && !passou(textoDaData(a, peca.mes, peca.dia))) {
        return textoDaData(a, peca.mes, peca.dia);
      }
    }
  }
  return null;   // não acontece com as regras acima
}


/* ---------------------------------------------------------
   3. HORAS (US26)
   --------------------------------------------------------- */

// Palavras que, logo depois de "às 10", confirmam que é hora (regra da
// palavra seguinte, requisitos, seção 3).
const PALAVRAS_DEPOIS_DA_HORA = ["e", "no", "na", "em", "com", "para", "pra", "ate"];

// Pontuação logo depois de "às 10" também confirma a hora.
const PONTUACAO = /[.,;:!?…()\[\]"'“”‘’\-–—]/;

/* "N da manhã/tarde/noite" -> hora em 24h, pela tabela de conversão.
   Devolve null quando a combinação não está na tabela ("2 da noite",
   "12 da manhã", "15h da manhã"): aí o "da ..." não é entendido. */
function horaComPeriodo(horas, periodo) {
  if (periodo === "manha" && horas >= 1 && horas <= 11) return horas;
  if (periodo === "tarde" && horas === 12) return 12;
  if (periodo === "tarde" && horas >= 1 && horas <= 11) return horas + 12;
  if (periodo === "noite" && horas >= 6 && horas <= 11) return horas + 12;
  if ((periodo === "tarde" || periodo === "noite") && horas >= 13 && horas <= 23) return horas;
  return null;
}

/* Regra da palavra seguinte para "às N" (sem "h", ":" ou "horas"):
   só é hora se depois do número vier o fim da frase, uma pontuação,
   uma das PALAVRAS_DEPOIS_DA_HORA ou outro pedaço reconhecido.
   Assim "buscar as 2 crianças" não vira hora. */
function horaConfirmadaDepois(contexto, posicao) {
  const texto = contexto.texto;
  const seguinte = pularEspacos(texto, posicao);
  if (seguinte >= texto.length) return true;
  if (PONTUACAO.test(texto[seguinte])) return true;
  const palavra = /[a-z]+(?![a-z0-9])/y;
  palavra.lastIndex = seguinte;
  const achada = palavra.exec(texto);
  if (achada && PALAVRAS_DEPOIS_DA_HORA.includes(achada[0])) return true;
  return pecaEm(contexto, seguinte) !== null;
}

/* Procura uma hora começando exatamente na posição. Devolve o pedaço
   ({ tipo: "hora", inicio, fim, hora: "HH:MM" }) ou null. */
function horaEm(contexto, posicao) {
  const texto = contexto.texto;

  // Palavra de ligação antes da hora: "às"/"as" (sem acento: "as"),
  // "à"/"a" e "ao". Ela só sai junto se houver uma hora logo depois.
  const ligacao = /(as|ao|a)\s+/y;
  ligacao.lastIndex = posicao;
  const achouLigacao = ligacao.exec(texto);
  const prefixo = achouLigacao ? achouLigacao[1] : null;
  const inicio = achouLigacao ? ligacao.lastIndex : posicao;

  const peca = function (fim, horas, minutos) {
    return { tipo: "hora", inicio: posicao, fim: fim, hora: doisDigitos(horas) + ":" + doisDigitos(minutos) };
  };

  // "meio-dia" e "meia-noite", com hífen, com espaço ou juntos.
  const especial = /(meio[-\s]?dia|meia[-\s]?noite)(?![a-z0-9])/y;
  especial.lastIndex = inicio;
  const achouEspecial = especial.exec(texto);
  if (achouEspecial) {
    return peca(especial.lastIndex, achouEspecial[1].startsWith("meio") ? 12 : 0, 0);
  }

  // Número, com "h" (e minutos), com ":" e minutos, ou sozinho.
  // Minutos sempre com 2 algarismos, de 00 a 59.
  const numero = new RegExp("(\\d{1,2})(?:h([0-5]\\d)?|:([0-5]\\d))?" + FIM_DE_PALAVRA, "y");
  numero.lastIndex = inicio;
  const achouNumero = numero.exec(texto);
  if (!achouNumero) return null;

  const horas = Number(achouNumero[1]);
  const minutos = Number(achouNumero[2] || achouNumero[3] || 0);
  const sozinho = !/[h:]/.test(achouNumero[0]);   // "10" (sem "h" e sem ":")
  let fim = numero.lastIndex;
  if (horas > 23) return null;                     // "25h" não é hora

  // "da manhã", "da tarde", "da noite" logo depois (tabela de conversão).
  const periodo = /\s+da\s+(manha|tarde|noite)(?![a-z0-9])/y;
  periodo.lastIndex = fim;
  const achouPeriodo = periodo.exec(texto);
  if (achouPeriodo) {
    const convertida = horaComPeriodo(horas, achouPeriodo[1]);
    if (convertida !== null) return peca(periodo.lastIndex, convertida, minutos);
  }

  // Com "h" ou ":", é hora (com ou sem ligação antes).
  if (!sozinho) return peca(fim, horas, minutos);

  // Número sozinho: só é hora depois de "às"/"as" ("um número sozinho
  // nunca vira hora").
  if (prefixo !== "as") return null;

  // "às 10 horas" (ou "hora"): a palavra sai junto e é hora com certeza.
  const palavraHoras = /\s+horas?(?![a-z0-9])/y;
  palavraHoras.lastIndex = fim;
  if (palavraHoras.exec(texto)) return peca(palavraHoras.lastIndex, horas, 0);

  // "às 10" sozinho: regra da palavra seguinte.
  if (!horaConfirmadaDepois(contexto, fim)) return null;
  return peca(fim, horas, 0);
}


/* ---------------------------------------------------------
   4. ACHAR OS PEDAÇOS DA FRASE
   --------------------------------------------------------- */

/* O pedaço (data ou hora) que começa na posição, ou null. Na mesma
   posição vale o mais comprido. O resultado de cada posição é guardado
   em contexto.memoria: as regras "hora logo depois" e "outro pedaço
   reconhecido" olham para a frente e pedem a mesma posição várias vezes. */
function pecaEm(contexto, posicao) {
  if (contexto.memoria.has(posicao)) return contexto.memoria.get(posicao);
  let achada = null;
  if (comecoDePalavra(contexto.texto, posicao)) {
    const data = dataEm(contexto, posicao);
    const hora = horaEm(contexto, posicao);
    if (data && hora) {
      achada = data.fim >= hora.fim ? data : hora;
    } else {
      achada = data || hora;
    }
  }
  contexto.memoria.set(posicao, achada);
  return achada;
}

/* Lê a frase da esquerda para a direita e devolve a lista de pedaços,
   na ordem. Um trecho que já faz parte de um pedaço não é lido de novo. */
function acharPecas(texto) {
  const contexto = { texto: texto, memoria: new Map() };
  const pecas = [];
  let posicao = 0;
  while (posicao < texto.length) {
    const peca = pecaEm(contexto, posicao);
    if (peca) {
      pecas.push(peca);
      posicao = peca.fim;
    } else {
      posicao++;
    }
  }
  return pecas;
}


/* ---------------------------------------------------------
   5. TÍTULO (US27)
   --------------------------------------------------------- */

// Sinais que saem do começo e do fim do título: espaços , . ; : - –
const PONTAS = /^[\s,.;:\-–]+|[\s,.;:\-–]+$/g;

/* Limpa o que sobrou da frase (requisitos, seção 3, "Limpeza do título"):
   espaços repetidos viram um; sai o espaço antes de , . ; :; saem das
   pontas os sinais e um "e" solto (repetindo até não sobrar nenhum);
   corta no limite; a primeira letra vira maiúscula. */
function limparTitulo(texto, limite) {
  let limpo = texto.replace(/\s+/g, " ").replace(/ ([,.;:])/g, "$1");

  let antes;
  do {
    antes = limpo;
    limpo = limpo.replace(PONTAS, "");
    // "e" solto no começo ou no fim ("reunião e" -> "reunião").
    limpo = limpo.replace(/^e(?=$|[\s,.;:\-–])/i, "").replace(/(^|[\s,.;:\-–])e$/i, "$1");
  } while (limpo !== antes);

  if (limpo.length > limite) {
    limpo = limpo.slice(0, limite);
    // Não deixa meio emoji no fim (um emoji ocupa 2 "letras" no JavaScript).
    if (/[\ud800-\udbff]$/.test(limpo)) limpo = limpo.slice(0, -1);
    limpo = limpo.trimEnd();
  }

  if (limpo !== "") {
    const primeira = limpo[0].toUpperCase();
    // Só troca se continuar uma letra só (o tamanho do título não muda).
    if (primeira.length === 1) limpo = primeira + limpo.slice(1);
  }
  return limpo;
}

/* A frase original sem os pedaços usados. Cada pedaço vira um espaço
   (para as palavras dos lados não grudarem); a limpeza tira o excesso. */
function tirarPecas(frase, pecas) {
  let resultado = "";
  let posicao = 0;
  pecas.forEach(function (peca) {
    resultado += frase.slice(posicao, peca.inicio) + " ";
    posicao = peca.fim;
  });
  return resultado + frase.slice(posicao);
}


/* ---------------------------------------------------------
   6. A FUNÇÃO PRINCIPAL
   --------------------------------------------------------- */

// Limite do título (US02).
const LIMITE_DO_TITULO = 100;

/* Entende a frase. "agora" é um Date (na tela, new Date()).
   Devolve:
   - titulo: texto limpo ("" = sem título);
   - data: "AAAA-MM-DD" ou null;
   - hora: "HH:MM" ou null (null = dia todo);
   - semData: true = marcar "Ainda sem data" (sem data e sem hora);
   - dataInexistente: "31/02" (como foi digitada) quando a única data
     da frase não existe; senão null;
   - nadaEntendido: true quando a frase não tem nenhum pedaço de data
     nem de hora (mostra a dica "Não encontrei data nem hora..."). */
function entenderFrase(frase, agora) {
  const texto = String(frase);
  const pecas = acharPecas(prepararFrase(texto));

  // Vale o primeiro de cada tipo. Data que não existe não "ocupa" a vez:
  // se houver outra data válida, vale ela (seção 3).
  const pecaData = pecas.find(function (p) { return p.tipo === "data" && p.existe; }) || null;
  const pecaInexistente = pecas.find(function (p) { return p.tipo === "data" && !p.existe; }) || null;
  const pecaHora = pecas.find(function (p) { return p.tipo === "hora"; }) || null;

  const hora = pecaHora ? pecaHora.hora : null;
  let data = null;
  if (pecaData) {
    data = resolverData(pecaData, hora, agora);
  } else if (hora && !pecaInexistente) {
    // D1: hora sem data -> hoje, se ainda não passou; senão, amanhã.
    const hoje = dataParaTexto(agora);
    if (compromissoPassou({ data: hoje, hora: hora }, agora)) {
      data = dataParaTexto(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1));
    } else {
      data = hoje;
    }
  }

  // Só sai do título o que virou campo (a data inexistente fica).
  const usadas = [pecaData, pecaHora].filter(Boolean).sort(function (a, b) { return a.inicio - b.inicio; });

  return {
    titulo: limparTitulo(tirarPecas(texto, usadas), LIMITE_DO_TITULO),
    data: data,
    hora: hora,
    semData: !pecaData && !pecaInexistente && !pecaHora,
    dataInexistente: !pecaData && pecaInexistente ? pecaInexistente.digitada : null,
    nadaEntendido: !pecas.some(function (p) { return p.tipo === "data" || p.tipo === "hora"; })
  };
}


/* ---------------------------------------------------------
   7. A LINHA "ENTENDI" (US28)
   --------------------------------------------------------- */

/* As partes da linha "Entendi", na ordem: data · hora · título.
   Cada parte: { tipo, texto }. O app.js transforma em elementos
   (com textContent) e escolhe a cor pelo tipo. */
function partesDoEntendi(resultado, agora) {
  const partes = [];

  if (resultado.data) {
    partes.push({ tipo: "data", texto: tituloDoDiaDaFrase(resultado.data, agora) });
  } else if (resultado.dataInexistente) {
    partes.push({ tipo: "sem-data", texto: "data a escolher" });
  } else {
    partes.push({ tipo: "sem-data", texto: "Ainda sem data" });
  }

  if (resultado.hora) {
    partes.push({ tipo: "hora", texto: resultado.hora });
  } else if (resultado.data) {
    partes.push({ tipo: "dia-todo", texto: "Dia todo" });   // sem data, a hora não aparece
  }

  if (resultado.titulo) {
    partes.push({ tipo: "titulo", texto: resultado.titulo });
  } else {
    partes.push({ tipo: "sem-titulo", texto: "sem título" });
  }
  return partes;
}

/* Título do dia para a linha: "Hoje", "Amanhã", "Sex, 13/11" ou
   "Seg, 15/11/2027". O "Ontem" do tituloDoDia é só das seções
   "Anteriores" e "Ficou pendente" (seção 3): aqui vira "Qua, 11/11". */
function tituloDoDiaDaFrase(textoData, agora) {
  const titulo = tituloDoDia(textoData, agora, false).texto;
  if (titulo !== "Ontem") return titulo;
  const data = textoParaData(textoData);
  return DIAS_DA_SEMANA[data.getDay()] + ", " + doisDigitos(data.getDate()) + "/" + doisDigitos(data.getMonth() + 1);
}

/* A linha inteira em texto, como aparece na tela:
   "Entendi: Amanhã · 10:00 · título 'Dentista'". Útil no console. */
function linhaDoEntendi(resultado, agora) {
  return "Entendi: " + partesDoEntendi(resultado, agora).map(function (parte) {
    return parte.tipo === "titulo" ? "título '" + parte.texto + "'" : parte.texto;
  }).join(" · ");
}
