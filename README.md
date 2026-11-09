# Agenda

Um site simples para anotar compromissos. Você vê os próximos compromissos agrupados por dia ("Hoje", "Amanhã", "Sex, 14/11 · daqui a 3 dias") e pode criar, editar e excluir cada um. O que já passou vai para a seção "Anteriores", sem sumir. E nada cai no esquecimento: o que você pediu para ser cobrado fica em "Ficou pendente" até você resolver.

### Veja o site: **https://joaosaccucci.github.io/agenda/**

## Funcionalidades

- **Lista por dia:** os próximos compromissos agrupados por dia, com hora ou "Dia todo".
- **Criar, editar e excluir** compromissos (a exclusão pede confirmação).
- **Anteriores:** o que já passou sai da frente, mas continua guardado, com a situação de cada um ("Feito", "Não vou fazer" ou "Passou").
- **Feito e Desfazer:** marque um compromisso como feito (até antes da hora) e desfaça se errar.
- **"Sair às...":** diga quanto tempo precisa para sair (15, 30, 45, 60 minutos ou outro valor) e a lista mostra a hora de sair. Faltando 15 minutos, vira "Sair em 12 min".
- **"Me cobrar se eu não fizer" e "Ficou pendente":** se a data passar sem você marcar "Feito", o compromisso fica numa seção no topo da página até você escolher **Feito**, **Remarcar** ou **Não vou fazer**.
- **Hora de fim:** diga até que horas vai o compromisso, pela hora ("Termina às") ou pela duração (30 min, 1 h, 2 h ou outro valor). Um campo preenche o outro, e o card mostra "09:30 – 10:30".
- **Conflito e aperto:** se dois compromissos do mesmo dia se atropelam, o card avisa "Conflito"; se não dá tempo de sair de um para o outro (pelo "Tempo para sair" ou 15 minutos), avisa "Aperto". O aviso nunca impede de salvar.
- **O que levar:** uma lista de até 20 itens em cada compromisso, que você vai marcando direto no card até aparecer "tudo pronto".
- **Próximos 7 dias:** uma faixa mostra hoje e os 6 dias seguintes, com quantos compromissos cada um tem ou "Livre". Tocar num dia ocupado leva a lista até ele.
- **Tema claro e letra grande:** os botões "Tema claro" e "Letra grande" trocam a aparência na hora. A escolha fica guardada neste navegador e já vale ao abrir a página, sem piscar (ela não vai na cópia dos dados).
- **Sem data:** anote algo que ainda não tem dia marcado ("Ainda sem data") e use **Agendar** quando souber.
- **Cópia dos dados:** o botão "Seus dados" baixa um arquivo `agenda-AAAA-MM-DD.json` com todos os compromissos.
- **Importar uma cópia:** abre um arquivo baixado pela Agenda e deixa escolher entre **Juntar** (acrescenta, sem apagar nada) e **Substituir tudo** (com confirmação). Serve para recuperar os dados ou levar a agenda para outro aparelho.
- **Lembrete de cópia:** se a última cópia tem mais de 30 dias e algo mudou desde então, uma faixa lembra de baixar uma cópia nova ("Depois" adia por 7 dias).
- **Atualização automática dos dados:** quem já usava a Agenda antes dessas funções não precisa fazer nada. Na primeira visita, os dados antigos são guardados como estavam e convertidos para o formato novo. Cópias baixadas antes também podem ser importadas.

## Tecnologias

- HTML, CSS e JavaScript puros: sem framework, sem bibliotecas, sem back-end e sem etapa de build.
- `localStorage` do navegador para guardar os compromissos e as preferências de aparência.
- Variáveis CSS (custom properties) para os dois temas, um script pequeno no `<head>` para aplicar o tema antes de a página aparecer, e `aria-pressed` nos botões de liga e desliga.
- `<fieldset>` com botões de opção e caixas de marcar para "Tempo para sair", "Me cobrar", "Ainda sem data" e o checklist "O que levar" (no card, um botão que abre uma lista de caixas de marcar), e `<select>` para a duração.
- `<dialog>` do HTML para o formulário, as confirmações e as janelas de cópia e importação.
- `Blob` e um link com `download` para gerar o arquivo de cópia no próprio navegador, e `<input type="file">` para escolher o arquivo a importar.
- Fontes Space Grotesk, JetBrains Mono e Exo 2 (Google Fonts). Se não carregarem, o site usa as fontes do sistema.
- Publicado no GitHub Pages.

## Como rodar no computador

1. Clone o repositório:
   ```bash
   git clone https://github.com/JoaoSaccucci/agenda.git
   ```
2. Abra o arquivo `index.html` no navegador (dois cliques já funcionam). Se preferir, use uma extensão de servidor local, como o Live Server do VS Code.

Não precisa instalar nada.

## Onde ficam os dados (limitações)

- Os compromissos ficam salvos **só no navegador** em que foram criados (no `localStorage`, nas chaves que começam com `agenda:`).
- Eles **não sincronizam** entre aparelhos nem entre navegadores diferentes.
- Eles **somem se o navegador for limpo** (limpar dados de navegação, por exemplo).
- Para se proteger disso e para levar a agenda para outro lugar, use **"Seus dados" → "Baixar cópia"** de vez em quando e, no outro navegador, **"Importar cópia"**. A cópia é manual: nada sincroniza sozinho.
- Nada é enviado para a internet e não há login. A cópia é um arquivo baixado no seu aparelho, e a importação só lê o arquivo que você escolher.

## Estrutura

```
agenda/
├── index.html          # a página (uma só)
├── favicon.svg         # ícone da aba
├── .gitattributes      # fim de linha padrão (LF)
├── css/style.css       # visual "quadro de partidas" (tema escuro e claro, letra normal e grande)
└── js/
    ├── datas.js          # regras de data e hora (Hoje, Amanhã, "passou", seção de cada item, "Sair às", hora de fim, conflito e aperto)
    ├── armazenamento.js  # ler e gravar no localStorage (o único que mexe nele) e atualizar os dados antigos
    ├── copia.js          # regras da cópia: montar o arquivo, conferir a importação, juntar, lembrete
    └── app.js            # a tela: seções, faixa da semana, formulário, checklist, Feito, pendências, excluir, "Seus dados", tema e letra, avisos
```

## Feito com a equipe da João Saccucci Labs

Este projeto foi feito com a equipe de agentes de IA da **João Saccucci Labs**: o product-owner escreveu os requisitos, o artista criou o visual, o dev programou, o testador conferiu e o professor explicou o código em aulas.

- Detalhe do projeto na Labs (requisitos, design e testes): https://joaosaccucci.github.io/empresa-ia/trabalhos/joao-saccucci-labs/detalhe-projeto.html?id=agenda
- Documentos no GitHub (requisitos, design e relatórios de teste): https://github.com/JoaoSaccucci/empresa-ia/tree/main/trabalhos/joao-saccucci-labs/docs/projetos/agenda
- Aulas sobre o código: https://joaosaccucci.github.io/empresa-ia/trabalhos/joao-saccucci-labs/aulas.html
- Site da Labs: https://joaosaccucci.github.io/empresa-ia/trabalhos/joao-saccucci-labs/
