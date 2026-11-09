/* =========================================================
   Agenda - armazenamento.js
   Tudo o que lê ou grava no localStorage fica aqui.

   Regras (requisitos, seção 3 e US07):
   - Toda chave começa com "agenda:". A Agenda divide o mesmo
     localStorage com o site da Labs (mesmo endereço
     joaosaccucci.github.io), então NUNCA usamos
     localStorage.clear() e nunca mexemos em chaves de outros.
   - Os dados ficam num objeto { versao: 2, compromissos: [...] }.
     (Até a Entrega 2a era a versão 1; a 2b atualiza sozinha, US11.)
   - Etapa 2a: chaves novas para a cópia dos dados (US08 a US10).
   - Etapa 3a: continua na versão 2, agora com duracaoMin (hora de fim)
     e itens (checklist "O que levar") preenchidos e conferidos.
   - Etapa 3b: chave nova "agenda:preferencias" (tema e letra),
     separada dos compromissos (fim do arquivo).
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
// Etapa 2b: o texto original da versão 1, guardado antes da migração (US11).
const CHAVE_V1 = "agenda:compromissos-v1";
const VERSAO_FORMATO = 2;

// Situações possíveis de um compromisso (Etapa 2b, US13 e US15).
const STATUS_VALIDOS = ["aberto", "feito", "nao-vou-fazer"];

// Começa como true e vira false se o localStorage não funcionar.
// Quando é false, a agenda funciona só na memória da página.
let armazenamentoDisponivel = true;

// Etapa 2b (US11): vira true quando os dados salvos não podem ser tocados
// (a migração falhou ou eles são de uma versão mais nova). A agenda
// funciona na tela, mas nada é gravado em "agenda:compromissos".
let gravacaoBloqueada = false;


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


/* Confere UM compromisso lido do localStorage ou de um arquivo de cópia.
   versao = 1 ou 2: o formato em que o item foi escrito.
   - Sem título ou com data inválida: devolve null (o item é ignorado).
     Na versão 1 a data é obrigatória; na versão 2, data null = "Sem data".
   - O resto é "arrumado": hora estranha vira null (dia todo), e um campo
     novo da versão 2 ausente ou fora da regra recebe o valor padrão.
   Devolve SEMPRE um item no formato da versão 2: assim um item da
   versão 1 já sai daqui convertido (US11), com o atualizadoEm de antes.
   Um item com problema não derruba os outros. */
function normalizarCompromisso(item, versao) {
  if (item === null || typeof item !== "object") return null;

  const titulo = textoOuNulo(item.titulo, 100);
  if (titulo === null) return null;

  const semData = versao === 2 && item.data === null;
  if (!semData && !dataValida(item.data)) return null;

  const data = semData ? null : item.data;
  // Sem data, também não há hora (seção 3).
  const hora = data !== null && horaValida(item.hora) ? item.hora : null;
  // Sem data, o item é sempre "aberto".
  const status = data !== null && STATUS_VALIDOS.includes(item.status) ? item.status : "aberto";

  return {
    id: typeof item.id === "string" && item.id !== "" ? item.id : criarId(),
    titulo: titulo,
    data: data,
    hora: hora,
    local: textoOuNulo(item.local, 100),
    observacao: textoOuNulo(item.observacao, 500),
    // Etapa 2b. Só vale com hora; inteiro de 1 a 720.
    antecedenciaMin: hora !== null && antecedenciaValida(item.antecedenciaMin) ? item.antecedenciaMin : null,
    // Só pode ser true se o item tiver data.
    cobrar: data !== null && item.cobrar === true,
    status: status,
    // Só tem valor quando o item foi resolvido ("feito" ou "nao-vou-fazer").
    concluidoEm: status !== "aberto" && isoParaData(item.concluidoEm) !== null ? item.concluidoEm : null,
    // Etapa 3a (US19): hora de fim, guardada como duração. Só vale com
    // hora e sem passar de 23:59. Na Etapa 2 era sempre null.
    duracaoMin: duracaoNoMesmoDia(item.duracaoMin, hora) ? item.duracaoMin : null,
    // Etapa 3a (US17 e US18): checklist "O que levar". Na Etapa 2 era sempre [].
    itens: normalizarItens(item.itens),
    criadoEm: typeof item.criadoEm === "string" ? item.criadoEm : null,
    atualizadoEm: typeof item.atualizadoEm === "string" ? item.atualizadoEm : null
  };
}

/* Tempo para sair (US12): número inteiro de 1 a 720 minutos (12 horas). */
function antecedenciaValida(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 720;
}


// Limites do checklist "O que levar" (US17).
const MAXIMO_DE_ITENS = 20;
const MAXIMO_DO_TEXTO_DO_ITEM = 60;

/* Hora de fim (US19): a duração vale se for de 1 a 1439 minutos, se o
   compromisso tiver hora e se o fim não passar de 23:59 (seção 3). */
function duracaoNoMesmoDia(duracao, hora) {
  return hora !== null && duracaoValida(duracao) && minutosDoDia(hora) + duracao <= ULTIMO_MINUTO_DO_DIA;
}

/* Confere a lista do checklist (seção 3, "Regras de leitura dos campos
   da Etapa 3"):
   - o que não for lista vira [];
   - item sem texto (ou só com espaços) é ignorado;
   - texto maior que 60 é cortado em 60 (e perde os espaços das pontas);
   - "feito" só é true se for exatamente true;
   - fica no máximo com 20 itens (do 21º válido em diante, ignorados). */
function normalizarItens(lista) {
  if (!Array.isArray(lista)) return [];
  const certos = [];
  for (const item of lista) {
    if (certos.length === MAXIMO_DE_ITENS) break;
    if (item === null || typeof item !== "object") continue;
    // textoOuNulo: tira os espaços das pontas e corta no limite. O trim()
    // de novo tira um espaço que tenha ficado no fim depois do corte.
    const cortado = textoOuNulo(item.texto, MAXIMO_DO_TEXTO_DO_ITEM);
    const texto = cortado === null ? "" : cortado.trim();
    if (texto === "") continue;
    certos.push({ texto: texto, feito: item.feito === true });
  }
  return certos;
}


/* Lê os compromissos salvos.
   Devolve { compromissos: [...], problema: ... }. O problema pode ser:
   - null: tudo certo;
   - "indisponivel": não dá para usar o localStorage;
   - "corrompido": o dado salvo não era um JSON no formato certo;
   - "migracao-falhou": dados da versão 1 que não puderam ser
     atualizados para a versão 2 (US11);
   - "versao-nova": dados de uma versão mais nova que a 2 (US11).
   Quem chama (app.js) decide qual aviso mostrar. */
function carregarCompromissos() {
  armazenamentoDisponivel = testarArmazenamento();
  gravacaoBloqueada = false;
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

  const ehObjeto = dados !== null && typeof dados === "object" && !Array.isArray(dados);

  // Versão mais nova que a nossa (US11): NÃO mexemos nesse dado. A agenda
  // mostra o que conseguir ler, mas não grava nada por cima dele.
  if (ehObjeto && typeof dados.versao === "number" && dados.versao > VERSAO_FORMATO) {
    gravacaoBloqueada = true;
    const lista = Array.isArray(dados.compromissos) ? conferirLista(dados.compromissos, VERSAO_FORMATO) : [];
    return { compromissos: lista, problema: "versao-nova" };
  }

  // O formato esperado é um objeto com a lista em "compromissos".
  if (!ehObjeto || !Array.isArray(dados.compromissos)) {
    guardarCopiaCorrompida(texto);
    return { compromissos: [], problema: "corrompido" };
  }

  // Versão 2: confere item por item e joga fora só os que têm problema.
  if (dados.versao === VERSAO_FORMATO) {
    return { compromissos: conferirLista(dados.compromissos, 2), problema: null };
  }

  // Versão 1 (a da Etapa 1 e da Entrega 2a): atualiza para a versão 2.
  return migrarDaVersao1(texto, conferirLista(dados.compromissos, 1));
}


/* Confere uma lista de itens e devolve só os que estão certos. */
function conferirLista(itens, versao) {
  const certos = [];
  itens.forEach(function (item) {
    const certo = normalizarCompromisso(item, versao);
    if (certo !== null) certos.push(certo);
  });
  return certos;
}


/* Migração da versão 1 para a versão 2 (US11).
   texto = o texto ORIGINAL de "agenda:compromissos";
   lista = os compromissos já convertidos (normalizarCompromisso).
   Ordem que protege os dados:
   1. guarda o texto original, sem nenhuma mudança, em
      "agenda:compromissos-v1" (se essa chave já existir, não mexe nela);
   2. só depois grava a versão 2 em "agenda:compromissos".
   Se algum passo falhar (localStorage cheio), nada mais é gravado
   enquanto a página estiver aberta: a agenda mostra os compromissos
   convertidos só na tela, e o que estava salvo continua intacto. */
function migrarDaVersao1(texto, lista) {
  try {
    if (window.localStorage.getItem(CHAVE_V1) === null) {
      window.localStorage.setItem(CHAVE_V1, texto);
    }
    // gravarLista, e não salvarCompromissos: a migração não é uma mudança
    // feita pela pessoa, então não conta para o lembrete de cópia (US10).
    gravarLista(lista);
  } catch (erro) {
    gravacaoBloqueada = true;
    return { compromissos: lista, problema: "migracao-falhou" };
  }
  return { compromissos: lista, problema: null };
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


/* Grava a lista inteira no formato da versão 2. Pode dar erro
   (localStorage cheio): quem chama trata o erro. */
function gravarLista(compromissos) {
  const dados = { versao: VERSAO_FORMATO, compromissos: compromissos };
  window.localStorage.setItem(CHAVE_COMPROMISSOS, JSON.stringify(dados));
}


/* Grava a lista depois de uma mudança feita pela pessoa. Devolve true se
   deu certo e false se não deu (ex.: localStorage cheio). Se o localStorage
   está indisponível, ou se a gravação está bloqueada (US11), não tenta
   gravar e devolve true: a agenda segue só na memória da página (o aviso
   disso já aparece desde que a página abriu). */
function salvarCompromissos(compromissos) {
  if (!armazenamentoDisponivel || gravacaoBloqueada) return true;

  try {
    gravarLista(compromissos);
  } catch (erro) {
    // O setItem falhou, então o que estava salvo antes continua lá, intacto.
    return false;
  }
  // A lista só é gravada quando algo mudou (criar, editar, excluir,
  // importar, marcar Feito ou "Não vou fazer" e desfazer). Por isso este
  // é o lugar certo para anotar a data da mudança, que o lembrete de
  // cópia usa (US10).
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
  // Com a gravação bloqueada (US11) a importação também falha: ela não
  // pode escrever por cima dos dados que a agenda não conseguiu atualizar.
  if (!armazenamentoDisponivel || gravacaoBloqueada) return false;

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


/* ---------------------------------------------------------
   Etapa 3b: preferências de aparência (US22 e US23)
   Ficam em "agenda:preferencias", separadas dos compromissos:
   não mudam a versão dos dados, não vão no arquivo de cópia e
   não gravam "agenda:ultima-mudanca" (não são mudança nos
   compromissos, então não contam para o lembrete de cópia).
   A LEITURA ao abrir a página é feita pelo script do <head> do
   index.html (precisa rodar antes de a página aparecer). Aqui
   fica só a gravação.
   --------------------------------------------------------- */
const CHAVE_PREFERENCIAS = "agenda:preferencias";

/* Grava { tema: "escuro" | "claro", letra: "normal" | "grande" }.
   Não usa o armazenamentoDisponivel de propósito: a preferência não
   depende dos compromissos. Se o localStorage estiver bloqueado ou
   cheio, devolve false sem aviso: a troca continua valendo até a
   página fechar (US22). */
function gravarPreferencias(preferencias) {
  try {
    window.localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({
      tema: preferencias.tema,
      letra: preferencias.letra
    }));
    return true;
  } catch (erro) {
    return false;
  }
}
