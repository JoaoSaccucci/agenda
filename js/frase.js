/* =========================================================
   Agenda - frase.js
   Etapa 4a (US24 a US28) e Entrega 4b (US29 a US32): "Criar por frase".

   Lê uma frase como "dentista amanhã das 10h às 11h na clínica levar RG"
   e devolve o que foi entendido: título, data, hora, hora de fim
   (intervalo ou duração), tempo para sair, local e os itens do
   "O que levar". Não mexe na tela nem no localStorage (como o
   datas.js): só recebe a frase e o "agora" e devolve um objeto.
   Por isso dá para conferir no console:

     entenderFrase("dentista amanhã às 10h", new Date(2026, 10, 12, 14, 0))
     -> { titulo: "Dentista", data: "2026-11-13", hora: "10:00", ... }

   Tudo é feito com expressões regulares e funções próprias,
   sem biblioteca e sem internet. As regras estão nos requisitos,
   seção 3, "Captura rápida (Etapa 4)".

   Usa funções de datas.js (carregado antes deste arquivo) e os
   limites do checklist de armazenamento.js (MAXIMO_DE_ITENS e
   MAXIMO_DO_TEXTO_DO_ITEM), que só são lidos quando a frase é
   entendida, e não quando este arquivo carrega.
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
// "/número" ou ":número" (assim "15/11/2" não vira "15/11" + resto).
const FIM_DE_PALAVRA = "(?![a-z0-9]|[/:]\\d)";

// Espaço inseparável: "até 11:00" e "sair 30 min antes" nunca se partem
// no meio na linha "Entendi" (design, 17.3.1).
const NBSP = " ";


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

// Correção da 4a (aprovada para a 4b): antes de "ter" e "dom" só contam
// estas ligações. Assim "para ter aula" não vira terça.
const LIGACOES_DE_TER_E_DOM = ["na proxima", "no proximo", "nesta", "neste", "proxima", "proximo", "no", "na"];

// Uma expressão só para todas as datas. Os grupos (os parênteses) dizem
// qual forma foi achada. "y" (sticky) = só procura NA posição pedida.
// O ano é lido com 1 a 4 algarismos; quem decide se ele vale é o anoDaFrase.
const EXPRESSAO_DATA = new RegExp(
  "(?:(" + LIGACOES_DE_DATA.join("|") + ")\\s+)?" +                // 1: ligação
  "(?:" +
    "(depois\\s+de\\s+amanha|amanha|hoje)" +                         // 2: relativa
    "|(segunda|terca|quarta|quinta|sexta)(?:[-\\s]feira)?" +         // 3: dia útil por extenso
    "|(sabado|domingo)" +                                            // 4: fim de semana por extenso
    "|(seg|ter|qua|qui|sex|sab|dom)\\.?" +                           // 5: abreviado (com ou sem ponto)
    "|dia\\s+(\\d{1,2})(?:/(\\d{1,2})(?:/(\\d{1,4}))?)?" +            // 6, 7, 8: "dia 15" ou "dia 15/11"
    "|(\\d{1,2})/(\\d{1,2})(?:/(\\d{1,4}))?" +                        // 9, 10, 11: "15/11" ou "15/11/2027"
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

/* O ano escrito na frase -> número. "27" vira 2027 (20AA); "2027" fica
   como está. Ano com 1 ou 3 algarismos ("202"), ou com 4 e menor que
   1000 ("0050"), devolve null: a data não existe (com o aviso). */
function anoDaFrase(textoAno) {
  if (textoAno.length === 2) return 2000 + Number(textoAno);
  const ano = Number(textoAno);
  return textoAno.length === 4 && ano >= 1000 ? ano : null;
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
    // com "na", "no", "nesta", "neste", "próxima" ou "próximo" antes
    // ("na ter") ou com uma hora logo depois ("ter 10h", "ter das 9 às 10").
    if ((nome === "ter" || nome === "dom") && !LIGACOES_DE_TER_E_DOM.includes(achado[1])) {
      if (!horaOuIntervaloEm(contexto, pularEspacos(texto, peca.fim))) return null;
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
    // "15/11", "15/11/2027", "15/11/27" (com ou sem "dia" antes).
    const dia = Number(achado[6] || achado[9]);
    const mes = Number(achado[7] || achado[10]);
    const textoAno = achado[8] || achado[11];
    peca.forma = "dia-mes";
    peca.dia = dia;
    peca.mes = mes;
    peca.ano = textoAno ? anoDaFrase(textoAno) : null;
    // A data como foi digitada, para o aviso "A data 31/02 não existe."
    // (os algarismos são iguais na frase original e na preparada).
    peca.digitada = (achado[6] || achado[9]) + "/" + (achado[7] || achado[10]) + (textoAno ? "/" + textoAno : "");
    if (textoAno && peca.ano === null) {
      peca.existe = false;   // ano "202" ou "0050": não existe (o "0050" virava 1950)
    } else {
      // Sem ano, vale o maior mês possível (fevereiro com 29): "29/02" existe.
      const ultimoDia = mes >= 1 && mes <= 12 ? diasNoMes(peca.ano !== null ? peca.ano : 2000, mes) : 0;
      peca.existe = dia >= 1 && dia <= ultimoDia;
    }
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
// palavra seguinte, requisitos, seção 3). "levar" (4b) também conta: é
// o começo de outro pedaço reconhecido ("às 10 levar RG").
const PALAVRAS_DEPOIS_DA_HORA = ["e", "no", "na", "em", "com", "para", "pra", "ate", "levar"];

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

/* Lê um número de hora na posição: "10", "10h", "10h30" ou "10:30".
   Hora de 0 a 23, minutos sempre com 2 algarismos (00 a 59).
   Devolve { horas, minutos, sozinho, fim } ou null.
   sozinho = true quando não tem "h" nem ":" (ex.: "10"). */
function lerNumeroDeHora(texto, posicao) {
  const numero = new RegExp("(\\d{1,2})(?:h([0-5]\\d)?|:([0-5]\\d))?" + FIM_DE_PALAVRA, "y");
  numero.lastIndex = posicao;
  const achado = numero.exec(texto);
  if (!achado) return null;
  const horas = Number(achado[1]);
  if (horas > 23) return null;                     // "25h" não é hora
  return {
    horas: horas,
    minutos: Number(achado[2] || achado[3] || 0),
    sozinho: !/[h:]/.test(achado[0]),
    fim: numero.lastIndex
  };
}

/* "da manhã", "da tarde" ou "da noite" logo depois da posição.
   Devolve { periodo: "manha" | "tarde" | "noite", fim } ou null. */
function lerPeriodo(texto, posicao) {
  const periodo = /\s+da\s+(manha|tarde|noite)(?![a-z0-9])/y;
  periodo.lastIndex = posicao;
  const achado = periodo.exec(texto);
  return achado ? { periodo: achado[1], fim: periodo.lastIndex } : null;
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
  const numero = lerNumeroDeHora(texto, inicio);
  if (!numero) return null;

  // "da manhã", "da tarde", "da noite" logo depois (tabela de conversão).
  const periodo = lerPeriodo(texto, numero.fim);
  if (periodo) {
    const convertida = horaComPeriodo(numero.horas, periodo.periodo);
    if (convertida !== null) return peca(periodo.fim, convertida, numero.minutos);
  }

  // Com "h" ou ":", é hora (com ou sem ligação antes).
  if (!numero.sozinho) return peca(numero.fim, numero.horas, numero.minutos);

  // Número sozinho: só é hora depois de "às"/"as" ("um número sozinho
  // nunca vira hora").
  if (prefixo !== "as") return null;

  // "às 10 horas" (ou "hora"): a palavra sai junto e é hora com certeza.
  const palavraHoras = /\s+horas?(?![a-z0-9])/y;
  palavraHoras.lastIndex = numero.fim;
  if (palavraHoras.exec(texto)) return peca(palavraHoras.lastIndex, numero.horas, 0);

  // "às 10" sozinho: regra da palavra seguinte.
  if (!horaConfirmadaDepois(contexto, numero.fim)) return null;
  return peca(numero.fim, numero.horas, 0);
}


/* ---------------------------------------------------------
   4. PEDAÇOS COMPOSTOS DA 4b (US29 e US30)
   "das 10 às 11" (intervalo), "por 1h30" (duração) e
   "sair 30 min antes". Dentro deles, os números são lidos uma
   vez só: o "1h30" de "sair 1h30 antes" não vira hora.
   --------------------------------------------------------- */

/* Intervalo: "das" + horário + "às"/"até"/"até as" + horário, com
   "da manhã/tarde/noite" opcional. Dentro dele os números são horas
   mesmo sem "h" ("das 10 às 11"). Devolve
   { tipo: "intervalo", inicio, fim, hora: "HH:MM", horaFim: "HH:MM" } ou null. */
function intervaloEm(texto, posicao) {
  const das = /das\s+/y;
  das.lastIndex = posicao;
  if (!das.exec(texto)) return null;

  const primeiro = lerNumeroDeHora(texto, das.lastIndex);
  if (!primeiro) return null;
  let horaInicio = primeiro.horas;
  let fim = primeiro.fim;
  // Trechos de dentro do intervalo que NÃO saem do título (veja tirarPecas).
  const manter = [];
  // O primeiro horário pode ter o seu próprio "da manhã/tarde/noite".
  // Fora da tabela ("das 2 da noite às 4"), o período é ignorado: o
  // intervalo vale com as horas e "da noite" fica no título (mesma
  // regra do segundo horário, abaixo).
  const periodo1 = lerPeriodo(texto, fim);
  if (periodo1) {
    const convertida = horaComPeriodo(primeiro.horas, periodo1.periodo);
    if (convertida !== null) horaInicio = convertida;
    else manter.push({ inicio: fim, fim: periodo1.fim });
    fim = periodo1.fim;
  }

  const ligacao = /\s+(?:ate\s+as|ate|as)\s+/y;
  ligacao.lastIndex = fim;
  if (!ligacao.exec(texto)) return null;

  const segundo = lerNumeroDeHora(texto, ligacao.lastIndex);
  if (!segundo) return null;
  let horaFim = segundo.horas;
  fim = segundo.fim;

  // "da tarde" depois do segundo horário vale para ele e também para o
  // primeiro, se o primeiro não tiver o seu e for menor ou igual ao
  // segundo ("das 2 às 4 da tarde" -> 14 às 16; "das 11 às 1 da tarde"
  // -> 11 às 13). Fora da tabela, o "da ..." fica no título.
  const periodo2 = lerPeriodo(texto, fim);
  if (periodo2 && horaComPeriodo(segundo.horas, periodo2.periodo) !== null) {
    horaFim = horaComPeriodo(segundo.horas, periodo2.periodo);
    fim = periodo2.fim;
    const primeiroAntes = primeiro.horas * 60 + primeiro.minutos <= segundo.horas * 60 + segundo.minutos;
    if (!periodo1 && primeiroAntes) {
      const convertida = horaComPeriodo(primeiro.horas, periodo2.periodo);
      if (convertida !== null) horaInicio = convertida;
    }
  }

  return {
    tipo: "intervalo",
    inicio: posicao,
    fim: fim,
    manter: manter,
    hora: doisDigitos(horaInicio) + ":" + doisDigitos(primeiro.minutos),
    horaFim: doisDigitos(horaFim) + ":" + doisDigitos(segundo.minutos)
  };
}

/* Um tempo em minutos: "30 min", "45 minutos", "1h", "1h30", "1 hora",
   "2 horas" ou "meia hora". Devolve { minutos, fim } ou null.
   Pode passar dos limites (ex.: "13h" = 780): quem decide o erro é o
   formulário, que mostra a mensagem de sempre. */
function lerTempo(texto, posicao) {
  const meiaHora = /meia\s+hora(?![a-z0-9])/y;
  meiaHora.lastIndex = posicao;
  if (meiaHora.exec(texto)) return { minutos: 30, fim: meiaHora.lastIndex };

  // "1h", "1h30" (e "1h30min").
  const comH = new RegExp("(\\d{1,3})h(?:([0-5]\\d)(?:min)?)?" + FIM_DE_PALAVRA, "y");
  comH.lastIndex = posicao;
  const achouH = comH.exec(texto);
  if (achouH) return { minutos: Number(achouH[1]) * 60 + Number(achouH[2] || 0), fim: comH.lastIndex };

  // "1 hora", "2 horas", "45 min", "90 minutos" (com ou sem espaço).
  const comPalavra = /(\d{1,4})\s*(horas?|minutos?|min)(?![a-z0-9])/y;
  comPalavra.lastIndex = posicao;
  const achouPalavra = comPalavra.exec(texto);
  if (achouPalavra) {
    const vezes = achouPalavra[2].startsWith("hora") ? 60 : 1;
    return { minutos: Number(achouPalavra[1]) * vezes, fim: comPalavra.lastIndex };
  }
  return null;
}

/* Duração: "por" ou "durante" + tempo ("por 1h30", "durante 3 horas").
   Devolve { tipo: "duracao", inicio, fim, minutos } ou null. */
function duracaoEm(texto, posicao) {
  const por = /(?:por|durante)\s+/y;
  por.lastIndex = posicao;
  if (!por.exec(texto)) return null;
  const tempo = lerTempo(texto, por.lastIndex);
  if (!tempo) return null;
  return { tipo: "duracao", inicio: posicao, fim: tempo.fim, minutos: tempo.minutos };
}

/* Tempo para sair: "sair" + tempo + "antes" ("sair 30 min antes").
   Devolve { tipo: "sair", inicio, fim, minutos } ou null. */
function sairEm(texto, posicao) {
  const sair = /sair\s+/y;
  sair.lastIndex = posicao;
  if (!sair.exec(texto)) return null;
  const tempo = lerTempo(texto, sair.lastIndex);
  if (!tempo) return null;
  const antes = /\s+antes(?![a-z0-9])/y;
  antes.lastIndex = tempo.fim;
  if (!antes.exec(texto)) return null;
  return { tipo: "sair", inicio: posicao, fim: antes.lastIndex, minutos: tempo.minutos };
}

/* Uma hora ou um intervalo na posição (para a regra D2 do "ter"/"dom"). */
function horaOuIntervaloEm(contexto, posicao) {
  if (!comecoDePalavra(contexto.texto, posicao)) return null;
  return intervaloEm(contexto.texto, posicao) || horaEm(contexto, posicao);
}


/* ---------------------------------------------------------
   5. ACHAR OS PEDAÇOS DA FRASE
   --------------------------------------------------------- */

/* O pedaço (data, hora, intervalo, duração ou "sair ... antes") que
   começa na posição, ou null. Na mesma posição vale o mais comprido
   (num empate, o que vem primeiro na lista: data antes de hora).
   O resultado de cada posição é guardado em contexto.memoria: as regras
   "hora logo depois" e "outro pedaço reconhecido" olham para a frente
   e pedem a mesma posição várias vezes. */
function pecaEm(contexto, posicao) {
  if (contexto.memoria.has(posicao)) return contexto.memoria.get(posicao);
  let achada = null;
  if (comecoDePalavra(contexto.texto, posicao)) {
    const texto = contexto.texto;
    const candidatas = [
      dataEm(contexto, posicao),
      horaEm(contexto, posicao),
      intervaloEm(texto, posicao),
      duracaoEm(texto, posicao),
      sairEm(texto, posicao)
    ];
    candidatas.forEach(function (peca) {
      if (peca && (!achada || peca.fim > achada.fim)) achada = peca;
    });
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
   6. LIMPEZA DO TÍTULO, DO LOCAL E DOS ITENS (US27)
   --------------------------------------------------------- */

// Sinais que saem do começo e do fim: espaços , . ; : - –
const PONTAS = /^[\s,.;:\-–]+|[\s,.;:\-–]+$/g;

/* Limpa um texto (requisitos, seção 3, "Limpeza"): espaços repetidos
   viram um; sai o espaço antes de , . ; :; saem das pontas os sinais;
   corta no limite; com "maiuscula", a primeira letra vira maiúscula.
   O "e" solto não é tirado aqui: só sai o "e" colado a um pedaço
   reconhecido (veja tirarPecas e textoDoPedacoLivre). */
function limparTexto(texto, limite, maiuscula) {
  let limpo = texto.replace(/\s+/g, " ").replace(/ ([,.;:])/g, "$1").replace(PONTAS, "");

  if (limpo.length > limite) {
    limpo = limpo.slice(0, limite);
    // Não deixa meio emoji no fim (um emoji ocupa 2 "letras" no JavaScript).
    if (/[\ud800-\udbff]$/.test(limpo)) limpo = limpo.slice(0, -1);
    limpo = limpo.replace(PONTAS, "");
  }

  if (maiuscula && limpo !== "") {
    const primeira = limpo[0].toUpperCase();
    // Só troca se continuar uma letra só (o tamanho do texto não muda).
    if (primeira.length === 1) limpo = primeira + limpo.slice(1);
  }
  return limpo;
}

// Um "e" MINÚSCULO no começo ou no fim de um trecho, com os espaços e a
// pontuação em volta. Só o "e" minúsculo é ligação: o "E" maiúsculo é
// sempre texto ("vitamina E", "ala E"). Decisão do João depois do teste da 4b.
// O hífen e o travessão NUNCA contam como fim ou começo da palavra "e"
// colados nela: "e-mail" e "pré-e" são palavras, não a ligação "e".
// Por isso, logo depois do "e" só vale espaço, , . ; : ou o fim do trecho,
// e logo antes dele só vale espaço, , . ; : ou o começo do trecho.
const E_NO_COMECO = /^[\s,.;:\-–]*e(?=[\s,.;:]|$)/;
const E_NO_FIM = /(^|[\s,.;:])e(?:[\s,.;:][\s,.;:\-–]*)?$/;

/* A frase original sem os pedaços usados. Cada pedaço vira um espaço
   (para as palavras dos lados não grudarem); a limpeza tira o excesso.
   Um "e" minúsculo colado a um pedaço sai junto com ele: "reunião e
   amanhã" e "reunião amanhã e" viram "Reunião". Um pedaço pode ter
   trechos que ficam no título (peca.manter: o "da noite" ignorado de
   "das 2 da noite às 4"). */
function tirarPecas(frase, pecas) {
  if (pecas.length === 0) return frase;
  let resultado = "";
  let posicao = 0;
  pecas.forEach(function (peca, i) {
    let trecho = frase.slice(posicao, peca.inicio);
    if (i > 0) trecho = trecho.replace(E_NO_COMECO, "");   // logo depois do pedaço anterior
    trecho = trecho.replace(E_NO_FIM, "$1");                 // logo antes deste pedaço
    const mantidos = (peca.manter || []).map(function (m) { return frase.slice(m.inicio, m.fim); });
    resultado += trecho + " " + mantidos.join(" ") + " ";
    posicao = peca.fim;
  });
  // O que sobra depois do último pedaço.
  return resultado + frase.slice(posicao).replace(E_NO_COMECO, "");
}


/* ---------------------------------------------------------
   7. LOCAL E "O QUE LEVAR" (US31 e US32)
   Os pedaços de texto livre: "levar ..." e "no/na ...". Eles são
   procurados por último, só fora dos outros pedaços, e vão até o
   começo do próximo pedaço reconhecido ou até o fim da frase.
   --------------------------------------------------------- */

// Limite do local (US02, igual ao título).
const LIMITE_DO_LOCAL = 100;

/* Procura as palavras que abrem um pedaço livre: a primeira "levar" e
   o primeiro "no"/"na" que estão FORA dos pedaços já achados e que não
   estão no começo da frase ("Levar o carro na oficina" -> "Levar" fica
   no título). Devolve { levar, local }, cada um { inicio, fimDaPalavra } ou null. */
function acharPalavrasLivres(texto, pecas) {
  const achadas = { levar: null, local: null };
  const palavra = /[a-z0-9]+/g;
  let achado;
  while ((achado = palavra.exec(texto)) !== null) {
    const inicio = achado.index;
    const dentroDeUmPedaco = pecas.some(function (p) { return inicio >= p.inicio && inicio < p.fim; });
    const noComeco = !LETRA_OU_NUMERO.test(texto.slice(0, inicio));
    if (dentroDeUmPedaco || noComeco) continue;
    const marca = { inicio: inicio, fimDaPalavra: palavra.lastIndex };
    if (achado[0] === "levar" && !achadas.levar) achadas.levar = marca;
    if ((achado[0] === "no" || achado[0] === "na") && !achadas.local) achadas.local = marca;
  }
  return achadas;
}

/* Onde termina um pedaço livre que começa em "inicio": no começo do
   próximo pedaço reconhecido (ou da outra palavra livre, "outra"),
   ou no fim da frase. */
function fimDoPedacoLivre(inicio, pecas, outra, tamanho) {
  let fim = tamanho;
  pecas.forEach(function (p) { if (p.inicio > inicio && p.inicio < fim) fim = p.inicio; });
  if (outra && outra.inicio > inicio && outra.inicio < fim) fim = outra.inicio;
  return fim;
}

/* O texto de um pedaço livre (da frase original). Se ele terminou
   colado num pedaço reconhecido, um "e" minúsculo no fim sai junto
   ("na clínica e amanhã" -> "clínica"; "na ala E amanhã" -> "ala E"). */
function textoDoPedacoLivre(frase, inicio, fim) {
  let texto = frase.slice(inicio, fim);
  if (fim < frase.length) texto = texto.replace(E_NO_FIM, "$1");
  return texto;
}

/* Separa os itens do "levar": por vírgula, ponto e vírgula ou " e "
   (só o "e" minúsculo: "levar vitamina E" é um item só, "vitamina E").
   Cada item é limpo como o título (sem maiúscula) e cortado em 60.
   Item vazio é ignorado. Os espaços em volta deixam achar um " e "
   também nas pontas ("RG e" -> "RG"). */
function separarItens(texto) {
  return (" " + texto + " ").split(/[,;]|\se(?=\s)/)
    .map(function (item) { return limparTexto(item, MAXIMO_DO_TEXTO_DO_ITEM, false); })
    .filter(function (item) { return item !== ""; });
}


/* ---------------------------------------------------------
   8. A FUNÇÃO PRINCIPAL
   --------------------------------------------------------- */

// Limite do título (US02).
const LIMITE_DO_TITULO = 100;

/* Entende a frase. "agora" é um Date (na tela, new Date()).
   Devolve:
   - titulo: texto limpo ("" = sem título);
   - data: "AAAA-MM-DD" ou null;
   - hora: "HH:MM" ou null (null = dia todo);
   - fim: "HH:MM" do intervalo ("das 10h às 11h" -> "11:00") ou null.
     Pode ser igual ou antes da hora: o formulário mostra o erro;
   - duracaoMin: minutos da duração ("por 1h30" -> 90) ou null. Pode
     estar fora do limite (0, mais de 1439, ou passar de 23:59);
   - antecedenciaMin: minutos do "sair ... antes" ou null. Pode estar
     fora de 1 a 720;
   - local: texto do "no/na ..." (limpo, até 100 letras) ou null;
   - itens: textos do "levar ..." (até 20, cada um até 60 letras);
   - itensDeFora: quantos itens passaram de 20 e ficaram de fora;
   - semData: true = marcar "Ainda sem data" (sem data e sem hora);
   - dataInexistente: "31/02" (como foi digitada) quando a única data
     da frase não existe; senão null;
   - nadaEntendido: true quando a frase não tem nenhum pedaço de data
     nem de hora (mostra a dica "Não encontrei data nem hora..."). */
function entenderFrase(frase, agora) {
  const texto = String(frase);
  const preparada = prepararFrase(texto);
  const pecas = acharPecas(preparada);

  // Vale o primeiro de cada tipo. Data que não existe não "ocupa" a vez:
  // se houver outra data válida, vale ela (seção 3).
  const primeira = function (teste) { return pecas.find(teste) || null; };
  const pecaData = primeira(function (p) { return p.tipo === "data" && p.existe; });
  const pecaInexistente = primeira(function (p) { return p.tipo === "data" && !p.existe; });
  // O intervalo conta como o pedaço de hora: vale o primeiro dos dois.
  const pecaHora = primeira(function (p) { return p.tipo === "hora" || p.tipo === "intervalo"; });
  const hora = pecaHora ? pecaHora.hora : null;

  // Fim: se a hora veio de um intervalo, ele também é o fim (as durações
  // ficam no título). Senão, a primeira duração, que só vale com hora.
  // O "sair ... antes" também só vale com hora.
  const intervalo = pecaHora && pecaHora.tipo === "intervalo" ? pecaHora : null;
  const pecaDuracao = hora && !intervalo ? primeira(function (p) { return p.tipo === "duracao"; }) : null;
  const pecaSair = hora ? primeira(function (p) { return p.tipo === "sair"; }) : null;

  let data = null;
  if (pecaData) {
    data = resolverData(pecaData, hora, agora);
  } else if (hora && !pecaInexistente) {
    // D1: hora sem data -> hoje, se ainda não passou; senão, amanhã.
    // No intervalo, vale o primeiro horário.
    const hoje = dataParaTexto(agora);
    if (compromissoPassou({ data: hoje, hora: hora }, agora)) {
      data = dataParaTexto(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1));
    } else {
      data = hoje;
    }
  }

  // Pedaços livres: "levar ..." e "no/na ...". Cada um vai até o próximo
  // pedaço reconhecido, e um termina onde o outro começa.
  const palavras = acharPalavrasLivres(preparada, pecas);
  const usadas = [pecaData, pecaHora, pecaDuracao, pecaSair].filter(Boolean);

  let local = null;
  if (palavras.local) {
    const fim = fimDoPedacoLivre(palavras.local.inicio, pecas, palavras.levar, texto.length);
    const limpo = limparTexto(textoDoPedacoLivre(texto, palavras.local.fimDaPalavra, fim), LIMITE_DO_LOCAL, true);
    // "no"/"na" sem texto depois ("reunião na") fica no título.
    if (limpo !== "") {
      local = limpo;
      usadas.push({ inicio: palavras.local.inicio, fim: fim });
    }
  }

  let itens = [];
  let itensDeFora = 0;
  if (palavras.levar) {
    const fim = fimDoPedacoLivre(palavras.levar.inicio, pecas, palavras.local, texto.length);
    const todos = separarItens(textoDoPedacoLivre(texto, palavras.levar.fimDaPalavra, fim));
    // "levar" sem nada depois fica no título.
    if (todos.length > 0) {
      itens = todos.slice(0, MAXIMO_DE_ITENS);
      itensDeFora = todos.length - itens.length;
      usadas.push({ inicio: palavras.levar.inicio, fim: fim });
    }
  }

  // Só sai do título o que virou campo (o que não foi usado fica).
  usadas.sort(function (a, b) { return a.inicio - b.inicio; });

  return {
    titulo: limparTexto(tirarPecas(texto, usadas), LIMITE_DO_TITULO, true),
    data: data,
    hora: hora,
    fim: intervalo ? intervalo.horaFim : null,
    duracaoMin: pecaDuracao ? pecaDuracao.minutos : null,
    antecedenciaMin: pecaSair ? pecaSair.minutos : null,
    local: local,
    itens: itens,
    itensDeFora: itensDeFora,
    semData: !pecaData && !pecaInexistente && !pecaHora,
    dataInexistente: !pecaData && pecaInexistente ? pecaInexistente.digitada : null,
    nadaEntendido: !pecas.some(function (p) { return p.tipo === "data" || p.tipo === "hora" || p.tipo === "intervalo"; })
  };
}


/* ---------------------------------------------------------
   9. A LINHA "ENTENDI" (US28, e as partes novas da 4b)
   --------------------------------------------------------- */

// Na linha, o "levar" mostra todos os itens até 4; com 5 ou mais, os 3
// primeiros e "e mais N itens" (design, 17.3.3, decisão 1).
const ITENS_NA_LINHA_SEM_RESUMO = 4;
const ITENS_NA_LINHA_COM_RESUMO = 3;

/* As partes da linha "Entendi", na ordem:
   data · hora · fim · sair · local · levar · título.
   Cada parte: { tipo, texto, antes, depois }. O app.js transforma em
   elementos (com textContent) e escolhe a cor pelo tipo. "antes" e
   "depois" são texto comum em volta do valor ("até " + "11:00").
   A parte "levar" é diferente: { tipo: "levar", itens, resto }, com os
   itens que aparecem e quantos ficaram resumidos em "e mais N itens". */
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

  // 4b: o valor aparece como foi entendido, mesmo com erro (decisão 4).
  if (resultado.fim) {
    partes.push({ tipo: "fim", antes: "até" + NBSP, texto: resultado.fim });
  } else if (resultado.duracaoMin !== null) {
    partes.push({ tipo: "fim", antes: "duração" + NBSP, texto: resultado.duracaoMin + NBSP + "min" });
  }

  if (resultado.antecedenciaMin !== null) {
    partes.push({ tipo: "sair", antes: "sair" + NBSP, texto: resultado.antecedenciaMin + NBSP + "min", depois: NBSP + "antes" });
  }

  if (resultado.local) {
    partes.push({ tipo: "local", antes: "local" + NBSP + "'", texto: resultado.local, depois: "'" });
  }

  if (resultado.itens.length > 0) {
    const mostrar = resultado.itens.length <= ITENS_NA_LINHA_SEM_RESUMO
      ? resultado.itens
      : resultado.itens.slice(0, ITENS_NA_LINHA_COM_RESUMO);
    partes.push({ tipo: "levar", itens: mostrar, resto: resultado.itens.length - mostrar.length });
  }

  if (resultado.titulo) {
    partes.push({ tipo: "titulo", antes: "título '", texto: resultado.titulo, depois: "'" });
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

/* O texto do fim da parte "levar": " e mais 17 itens". O espaço antes
   do "e" é comum (a linha pode quebrar ali); os outros são inseparáveis. */
function textoDoResto(resto) {
  return " e" + NBSP + "mais" + NBSP + resto + NBSP + "itens";
}

/* A linha inteira em texto, como aparece na tela:
   "Entendi: Amanhã · 10:00 · título 'Dentista'". Útil no console. */
function linhaDoEntendi(resultado, agora) {
  return "Entendi: " + partesDoEntendi(resultado, agora).map(function (parte) {
    if (parte.tipo === "levar") {
      const lista = parte.itens.map(function (item) { return "'" + item + "'"; }).join(", ");
      return "levar" + NBSP + lista + (parte.resto > 0 ? textoDoResto(parte.resto) : "");
    }
    return (parte.antes || "") + parte.texto + (parte.depois || "");
  }).join(" · ");
}
