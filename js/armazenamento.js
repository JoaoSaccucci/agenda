/* =========================================================
   Agenda - armazenamento.js
   Tudo o que lê ou grava no localStorage fica aqui.

   Regras (requisitos, seção 3 e US07):
   - Toda chave começa com "agenda:". A Agenda divide o mesmo
     localStorage com o site da Labs (mesmo endereço
     joaosaccucci.github.io), então NUNCA usamos
     localStorage.clear() e nunca mexemos em chaves de outros.
   - Os dados ficam num objeto { versao: 1, compromissos: [...] }.
   - Etapa 2a: chaves novas para a cópia dos dados (US08 a US10).
   ========================================================= */

const CHAVE_COMPROMISSOS = "agenda:compromissos";
const CHAVE_CORROMPIDO = "agenda:compromissos-corrompido";
const CHAVE_TESTE = "agenda:teste";
// Etapa 2a. As três primeiras guardam uma data e hora no formato ISO;
// a última guarda o texto inteiro de "agenda:compromissos".
const CHAVE_ULTIMO_BACKUP = "agenda:ultimo-backup";                // última cópia baixada
const CHAVE_ULTIMA_MUDANCA = "agenda:ultima-mudanca";              // última criação, edição, exclusão ou importação
const CHAVE_LEMBRETE_ADIADO = "agenda:lembrete-backup-adiado-ate"; // até quando o lembrete fica escondido
const CHAVE_ANTES_DA_IMPORTACAO = "agenda:compromissos-antes-da-importacao"; // lista de antes do "Substituir tudo"
const VERSAO_FORMATO = 1;

// Começa como true e vira false se o localStorage não funcionar.
// Quando é false, a agenda funciona só na memória da página.
let armazenamentoDisponivel = true;


/* Testa se dá para usar o localStorage: grava e apaga uma chave de teste.
   Em alguns navegadores (bloqueado, modo anônimo restrito), só de
   encostar no localStorage já dá erro. O try/catch "segura" esse erro
   para ele não quebrar a página. */
function testarArmazenamento() {
  try {
    window.localStorage.setItem(CHAVE_TESTE, "1");
    window.localStorage.removeItem(CHAVE_TESTE);
    return true;
  } catch (erro) {
    return false;
  }
}


/* Texto -> texto sem espaços nas pontas, ou null se ficar vazio.
   Usada para os campos opcionais (local e observação). */
function textoOuNulo(valor, limite) {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().slice(0, limite);
  return limpo === "" ? null : limpo;
}


/* Confere UM compromisso lido do localStorage.
   - Sem título ou com data inválida: devolve null (o item é ignorado).
   - O resto é "arrumado": hora estranha vira null (dia todo), etc.
   Assim um item com problema não derruba os outros. */
function normalizarCompromisso(item) {
  if (item === null || typeof item !== "object") return null;

  const titulo = textoOuNulo(item.titulo, 100);
  if (titulo === null || !dataValida(item.data)) return null;

  return {
    id: typeof item.id === "string" && item.id !== "" ? item.id : criarId(),
    titulo: titulo,
    data: item.data,
    hora: horaValida(item.hora) ? item.hora : null,
    local: textoOuNulo(item.local, 100),
    observacao: textoOuNulo(item.observacao, 500),
    criadoEm: typeof item.criadoEm === "string" ? item.criadoEm : null,
    atualizadoEm: typeof item.atualizadoEm === "string" ? item.atualizadoEm : null
  };
}


/* Lê os compromissos salvos.
   Devolve { compromissos: [...], problema: null | "indisponivel" | "corrompido" }.
   Quem chama (app.js) decide qual aviso mostrar. */
function carregarCompromissos() {
  armazenamentoDisponivel = testarArmazenamento();
  if (!armazenamentoDisponivel) {
    return { compromissos: [], problema: "indisponivel" };
  }

  const texto = window.localStorage.getItem(CHAVE_COMPROMISSOS);
  if (texto === null) {
    // Primeira visita: ainda não há nada salvo.
    return { compromissos: [], problema: null };
  }

  // JSON.parse dá erro se o texto não for um JSON válido.
  let dados = null;
  try {
    dados = JSON.parse(texto);
  } catch (erro) {
    dados = null;
  }

  // O formato esperado é um objeto com a lista em "compromissos".
  const formatoCerto = dados !== null && typeof dados === "object" && Array.isArray(dados.compromissos);
  if (!formatoCerto) {
    guardarCopiaCorrompida(texto);
    return { compromissos: [], problema: "corrompido" };
  }

  // Lista boa: confere item por item e joga fora só os que têm problema.
  const compromissos = [];
  dados.compromissos.forEach(function (item) {
    const certo = normalizarCompromisso(item);
    if (certo !== null) compromissos.push(certo);
  });
  return { compromissos: compromissos, problema: null };
}


/* Dado corrompido: NÃO apagamos. Copiamos o texto original para
   "agenda:compromissos-corrompido" antes de a agenda começar vazia.
   Se nem a cópia der certo, paramos de gravar de vez: assim o próximo
   "Salvar" não escreve por cima do dado original. */
function guardarCopiaCorrompida(texto) {
  try {
    window.localStorage.setItem(CHAVE_CORROMPIDO, texto);
  } catch (erro) {
    armazenamentoDisponivel = false;
  }
}


/* Grava a lista inteira. Devolve true se deu certo e false se não deu
   (ex.: localStorage cheio). Se o localStorage está indisponível, não
   tenta gravar e devolve true: a agenda segue só na memória da página
   (o aviso disso já aparece desde que a página abriu). */
function salvarCompromissos(compromissos) {
  if (!armazenamentoDisponivel) return true;

  const dados = { versao: VERSAO_FORMATO, compromissos: compromissos };
  try {
    window.localStorage.setItem(CHAVE_COMPROMISSOS, JSON.stringify(dados));
  } catch (erro) {
    // O setItem falhou, então o que estava salvo antes continua lá, intacto.
    return false;
  }
  // A lista só é gravada quando algo mudou (criar, editar, excluir ou
  // importar). Por isso este é o lugar certo para anotar a data da
  // mudança, que o lembrete de cópia usa (US10).
  gravarDataHora(CHAVE_ULTIMA_MUDANCA, new Date().toISOString());
  return true;
}


/* Cria um id único, no formato do requisito: "c-1731590400000-k3f9".
   Date.now() = milissegundos desde 1970; o final são 4 letras/números
   sorteados, para dois compromissos criados no mesmo milissegundo
   não ficarem com o mesmo id. */
function criarId() {
  const sorteio = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return "c-" + Date.now() + "-" + sorteio;
}


/* ---------------------------------------------------------
   Etapa 2a: cópia, lembrete e importação (US08, US09, US10)
   --------------------------------------------------------- */

/* Lê uma das chaves de data e hora. Devolve o texto ISO ou null
   (chave vazia ou localStorage indisponível). */
function lerDataHora(chave) {
  if (!armazenamentoDisponivel) return null;
  try {
    return window.localStorage.getItem(chave);
  } catch (erro) {
    return null;
  }
}

/* Grava uma das chaves de data e hora. Se não der (localStorage cheio
   ou indisponível), devolve false e a agenda segue normalmente: essas
   datas servem só para o lembrete, nenhum compromisso se perde. */
function gravarDataHora(chave, textoIso) {
  if (!armazenamentoDisponivel) return false;
  try {
    window.localStorage.setItem(chave, textoIso);
    return true;
  } catch (erro) {
    return false;
  }
}

// Atalhos com nomes que dizem para que serve cada chave.
function lerUltimoBackup() { return lerDataHora(CHAVE_ULTIMO_BACKUP); }
function lerUltimaMudanca() { return lerDataHora(CHAVE_ULTIMA_MUDANCA); }
function lerLembreteAdiadoAte() { return lerDataHora(CHAVE_LEMBRETE_ADIADO); }
function registrarBackup(textoIso) { return gravarDataHora(CHAVE_ULTIMO_BACKUP, textoIso); }
function adiarLembrete(textoIso) { return gravarDataHora(CHAVE_LEMBRETE_ADIADO, textoIso); }


/* Grava a lista que veio de uma importação (US09).
   - substituirTudo = true: ANTES de gravar, guarda o conteúdo atual de
     "agenda:compromissos" em "agenda:compromissos-antes-da-importacao".
     Se essa cópia de segurança não puder ser gravada, a importação para
     aqui e nada muda (nunca trocamos a lista sem guardar o "antes").
   - Diferente do salvarCompromissos: com o localStorage indisponível,
     a importação FALHA (devolve false), como pede a US09. Importar só
     na memória da página daria a falsa impressão de que os dados
     ficaram guardados neste navegador.
   Devolve true se gravou e false se nada mudou no que estava salvo. */
function gravarImportacao(lista, substituirTudo) {
  if (!armazenamentoDisponivel) return false;

  if (substituirTudo) {
    try {
      const textoAtual = window.localStorage.getItem(CHAVE_COMPROMISSOS);
      // Sem nada salvo ainda (primeira visita), não há o que guardar.
      if (textoAtual !== null) {
        window.localStorage.setItem(CHAVE_ANTES_DA_IMPORTACAO, textoAtual);
      }
    } catch (erro) {
      return false;
    }
  }

  return salvarCompromissos(lista);
}
