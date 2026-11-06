/* =========================================================
   Agenda - datas.js
   Funções sobre datas e horas. Não mexem na tela nem no
   localStorage: só recebem valores e devolvem respostas.

   Combinado importante: a data é sempre guardada como texto
   "AAAA-MM-DD" (o mesmo formato do <input type="date">) e a
   hora como "HH:MM" (24h). Para fazer contas, transformamos
   esse texto num objeto Date no FUSO DO APARELHO.
   ========================================================= */


// Abreviações dos dias da semana. getDay() devolve 0 para domingo.
const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];


/* Põe zero à esquerda: 5 -> "05". */
function doisDigitos(numero) {
  return String(numero).padStart(2, "0");
}


/* Transforma um Date no texto "AAAA-MM-DD", usando o dia LOCAL.
   (Não usamos toISOString(), porque ele converte para o fuso de
   Londres: às 22h no Brasil ele já diria que é o dia seguinte.) */
function dataParaTexto(data) {
  return data.getFullYear() + "-" + doisDigitos(data.getMonth() + 1) + "-" + doisDigitos(data.getDate());
}


/* O dia de hoje, no formato "AAAA-MM-DD". */
function hojeEmTexto(agora) {
  return dataParaTexto(agora);
}


/* Confere se o texto é uma data de verdade no formato "AAAA-MM-DD".
   O new Date(2026, 1, 31) "conserta" sozinho para 3 de março, por isso
   comparamos o resultado com o que foi pedido: se mudou, a data não existe. */
function dataValida(texto) {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  const [ano, mes, dia] = texto.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}


/* Confere se o texto é uma hora "HH:MM" de 00:00 a 23:59. */
function horaValida(texto) {
  return typeof texto === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}


/* "AAAA-MM-DD" (e, se tiver, "HH:MM") -> Date local.
   Os meses do Date começam em 0 (janeiro = 0), por isso o "mes - 1". */
function textoParaData(textoData, textoHora) {
  const [ano, mes, dia] = textoData.split("-").map(Number);
  let horas = 0;
  let minutos = 0;
  if (textoHora) {
    [horas, minutos] = textoHora.split(":").map(Number);
  }
  return new Date(ano, mes - 1, dia, horas, minutos);
}


/* Quantos dias de CALENDÁRIO vão de uma data até outra (as duas em texto).
   Ex.: de "2026-11-04" até "2026-11-07" = 3. Negativo = no passado.
   As duas viram meia-noite; o Math.round corrige os dias de 23 ou 25 horas
   que podem aparecer quando muda o horário de verão. */
function diasEntre(textoInicio, textoFim) {
  const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;
  const diferenca = textoParaData(textoFim) - textoParaData(textoInicio);
  return Math.round(diferenca / UM_DIA_EM_MS);
}


/* Regra "quando um compromisso passou" (seção 3 dos requisitos):
   - com hora: passou quando o relógio está DEPOIS do minuto marcado.
     Um compromisso às 10:00 ainda está na lista às 10:00 e passa às 10:01.
   - dia todo: passou a partir da meia-noite do dia seguinte.
   - sem data (Etapa 2b): nunca passa. */
function compromissoPassou(compromisso, agora) {
  if (compromisso.data === null) return false;
  let limite;
  if (compromisso.hora) {
    limite = textoParaData(compromisso.data, compromisso.hora);
    limite.setMinutes(limite.getMinutes() + 1);   // começo do minuto seguinte
  } else {
    limite = textoParaData(compromisso.data);
    limite.setDate(limite.getDate() + 1);         // meia-noite do dia seguinte
  }
  return agora >= limite;
}


/* Título de um dia: "Hoje", "Amanhã", "Ontem" ou "Sex, 14/11"
   (com o ano, "Sex, 14/11/2027", quando o ano é diferente do atual).
   Devolve um objeto com o texto e, quando faz sentido, a contagem
   "daqui a X dias". A contagem só aparece na lista principal
   (comContagem = true) e a partir do terceiro dia (depois de amanhã). */
function tituloDoDia(textoData, agora, comContagem) {
  const hoje = hojeEmTexto(agora);
  const distancia = diasEntre(hoje, textoData);

  if (distancia === 0) return { texto: "Hoje", contagem: null };
  if (distancia === 1) return { texto: "Amanhã", contagem: null };
  if (distancia === -1) return { texto: "Ontem", contagem: null };

  const data = textoParaData(textoData);
  let texto = DIAS_DA_SEMANA[data.getDay()] + ", " + doisDigitos(data.getDate()) + "/" + doisDigitos(data.getMonth() + 1);
  if (data.getFullYear() !== agora.getFullYear()) {
    texto += "/" + data.getFullYear();
  }

  let contagem = null;
  if (comContagem && distancia >= 2) {
    contagem = "daqui a " + distancia + " dias";
  }
  return { texto: texto, contagem: contagem };
}


/* ---------------------------------------------------------
   Etapa 2a: datas da cópia (US08 e US10)
   --------------------------------------------------------- */

/* Texto ISO guardado no localStorage ("2026-11-05T21:10:00.000Z") -> Date.
   Devolve null se o texto não existir ou não for uma data de verdade
   (Date.parse devolve NaN, "Not a Number", quando não entende o texto). */
function isoParaData(texto) {
  if (typeof texto !== "string") return null;
  const milissegundos = Date.parse(texto);
  return Number.isNaN(milissegundos) ? null : new Date(milissegundos);
}


/* Date -> "05/11/2026" (dia LOCAL, com o ano). Usada na "Última cópia". */
function dataComAno(data) {
  return doisDigitos(data.getDate()) + "/" + doisDigitos(data.getMonth() + 1) + "/" + data.getFullYear();
}


/* Date -> "2026-11-05T18:10" (hora LOCAL), o formato do atributo
   datetime da tag <time>. */
function dataHoraParaAtributo(data) {
  return dataParaTexto(data) + "T" + horaParaTexto(data);
}


/* Date -> "08:50" (hora LOCAL, 24h). */
function horaParaTexto(data) {
  return doisDigitos(data.getHours()) + ":" + doisDigitos(data.getMinutes());
}


/* ---------------------------------------------------------
   Etapa 2b: onde cada item aparece e "Sair às" (US12 a US16)
   --------------------------------------------------------- */

/* Em qual seção da página o compromisso aparece (requisitos, seção 3,
   "Onde cada item aparece"). As perguntas são feitas NESTA ordem e vale
   a primeira que bater. Devolve "sem-data", "anteriores", "pendentes"
   ou "proximos". */
function secaoDoCompromisso(compromisso, agora) {
  if (compromisso.data === null) return "sem-data";
  if (compromisso.status === "feito" || compromisso.status === "nao-vou-fazer") return "anteriores";
  if (compromissoPassou(compromisso, agora)) {
    return compromisso.cobrar ? "pendentes" : "anteriores";
  }
  return "proximos";
}


/* Situação mostrada em "Anteriores": "Feito", "Não vou fazer" ou "Passou". */
function situacaoDoCompromisso(compromisso) {
  if (compromisso.status === "feito") return { classe: "feito", texto: "Feito" };
  if (compromisso.status === "nao-vou-fazer") return { classe: "nao-vou-fazer", texto: "Não vou fazer" };
  return { classe: "passou", texto: "Passou" };
}


// "Sair em X min" começa 15 minutos antes da hora de sair (US12).
const MINUTOS_DE_AVISO_PARA_SAIR = 15;

/* "Sair às..." de um compromisso (US12). Devolve null se o compromisso
   não tem hora ou não tem tempo para sair. Senão devolve:
   - estado: "normal" | "logo" | "passou" (vira o data-estado no HTML);
   - horaSair: o Date da hora de sair;
   - diaAnterior: true se a hora de sair cai no dia anterior;
   - minutos: no estado "logo", quantos minutos faltam (0 = "Sair agora").

   As contas usam o MINUTO atual, sem os segundos (como a regra do
   "passou"): às 08:35 faltam 15 min para sair às 08:50, às 08:49 falta
   1 min, às 08:50 é "Sair agora" e às 08:51 a hora de sair já passou. */
function calcularSairAs(compromisso, agora) {
  if (!compromisso.data || !compromisso.hora || !compromisso.antecedenciaMin) return null;

  const horaSair = textoParaData(compromisso.data, compromisso.hora);
  // setMinutes com número negativo "volta" o relógio, até para o dia anterior.
  horaSair.setMinutes(horaSair.getMinutes() - compromisso.antecedenciaMin);

  const minutoAtual = new Date(agora);
  minutoAtual.setSeconds(0, 0);   // tira segundos e milissegundos
  const faltam = Math.round((horaSair - minutoAtual) / 60000);   // em minutos

  let estado = "normal";
  if (faltam < 0) {
    estado = "passou";
  } else if (faltam <= MINUTOS_DE_AVISO_PARA_SAIR) {
    estado = "logo";
  }

  return {
    estado: estado,
    horaSair: horaSair,
    diaAnterior: dataParaTexto(horaSair) !== compromisso.data,
    minutos: estado === "logo" ? faltam : null
  };
}
