/* ==========================================================================
   Portugol Trainer — Conteúdo pedagógico (módulos, lições e exercícios)
   Tipos de exercício: code | quiz | place | order | match
   ========================================================================== */
(function (G) {
  'use strict';
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const W = b => 'programa\n{\n    funcao inicio()\n    {\n' + b.split('\n').map(l => (l ? '        ' + l : '')).join('\n') + '\n    }\n}\n';
  const C = (code, titulo) => `<div class="codeblock">${titulo ? `<div class="cb-title">${titulo}</div>` : ''}<pre class="code">${Hl.html(code)}</pre><button class="btn ghost sm" data-act="try" data-code="${encodeURIComponent(code)}">Abrir no laboratório</button></div>`;
  const BAD = (code, msg) => `<div class="errbox bad"><div class="eb-h">Exemplo com erro</div><pre class="code">${Hl.html(code)}</pre><p>${msg}</p><button class="btn ghost sm" data-act="try" data-code="${encodeURIComponent(code)}">Testar no laboratório</button></div>`;
  const OKB = (code, msg) => `<div class="errbox good"><div class="eb-h">Forma correta</div><pre class="code">${Hl.html(code)}</pre><p>${msg}</p></div>`;
  const NOTE = (t, k) => `<div class="callout ${k || 'info'}">${t}</div>`;

  /* ---------- regras de avaliação ---------- */
  const R = {
    ok: label => ({ label, test: () => true }),
    usa: (n, label, fail) => ({ label: label || `Usa o comando ${n}()`, test: c => c.has(n), fail: fail || `Faltou usar o comando ${n}.` }),
    cnt: (n, k, label, fail) => ({ label: label || `Usa ${n} ${k > 1 ? 'pelo menos ' + k + ' vezes' : 'no mínimo uma vez'}`, test: c => (c.stats[n] || 0) >= k, fail: fail || `Você precisa usar ${n} pelo menos ${k} vez(es).` }),
    decl: (tipo, n = 1, label) => ({ label: label || `Declara ${n > 1 ? n + ' variáveis' : 'uma variável'} do tipo ${tipo}`, test: c => c.decls(tipo) >= n, fail: `Declare ${n > 1 ? n + ' variáveis' : 'uma variável'} do tipo ${tipo}: primeiro o tipo, depois o nome.` }),
    declNum: (n, label) => ({ label: label || `Declara ${n} variáveis numéricas`, test: c => c.decls('inteiro') + c.decls('real') >= n, fail: `Declare ${n} variáveis numéricas (inteiro ou real).` }),
    op: (o, label) => ({ label: label || `Usa o operador ${o}`, test: c => c.stats.ops.has(o), fail: `Use o operador ${o} no seu algoritmo (a máquina deve fazer a conta, não você).` }),
    strs: (n, label) => ({ label: label || `Usa ${n} textos diferentes`, test: c => new Set(c.tokens.filter(t => t.t === 'str').map(t => t.v)).size >= n, fail: `Use ${n} textos diferentes entre aspas.` }),
    semNum: (n, label) => ({ label: label || `Não escreve o resultado pronto (${n})`, test: c => !c.tokens.some(t => t.t === 'num' && t.v === n), fail: `Não escreva o número ${n} pronto: deixe o computador calcular.` }),
    saida: label => ({ label: label || 'Mostra algo no console', test: async c => { const r = await c.run([]); return r.erro ? { ok: false, msg: r.erro } : { ok: r.out.trim().length > 0, msg: 'O programa não mostrou nada no console. Use escreva().' }; } }),
    out: (inputs, exp, label, show) => ({
      label: label || 'Resultado correto', async test(c) {
        const r = await c.run(inputs);
        if (r.erro) return { ok: false, msg: r.erro };
        const ok = typeof exp === 'string' ? norm(r.out) === norm(exp) : exp instanceof RegExp ? exp.test(r.out) : exp(r.out);
        if (ok) return { ok: true };
        const ent = inputs.length ? 'as entradas ' + inputs.join(', ') : 'este teste';
        return { ok: false, msg: `Com ${ent}, seu programa mostrou: "${r.out.trim() || '(nada)'}". ${show || (typeof exp === 'string' ? 'Era esperado: "' + exp + '".' : '')}` };
      }
    }),
    vr: (tipo, valor, label) => ({
      label: label || `Variável ${tipo} com valor ${valor}`, async test(c) {
        const r = await c.run([]);
        if (r.erro) return { ok: false, msg: r.erro };
        const ok = r.vars.some(v => v.type === tipo && v.value === valor);
        return { ok, msg: `Não encontrei na memória uma variável do tipo ${tipo} guardando ${typeof valor === 'string' ? '"' + valor + '"' : valor}. Veja o painel Memória depois de executar.` };
      }
    }),
    atrib: (n, label) => ({ label: label || 'Usa atribuição (variável = valor)', test: c => Math.max(c.stats.atrib || 0, c.tokens.filter(t => t.t === 'op' && t.v === '=').length) >= n, fail: 'Faltou guardar um valor na variável usando o sinal = (ex.: idade = 18).' }),
    dist: (inputsList, label) => ({
      label, async test(c) {
        const outs = [];
        for (const i of inputsList) { const r = await c.run(i); if (r.erro) return { ok: false, msg: r.erro }; outs.push(norm(r.out)); }
        return { ok: new Set(outs).size === outs.length && outs.every(o => o), msg: 'Cada opção do menu deve mostrar uma mensagem diferente (e nenhuma pode ficar vazia).' };
      }
    })
  };
  const not = re => o => !re.test(o);
  const nao = (a, b) => o => a.test(o) && !b.test(o);

  /* ---------- helpers de questões ---------- */
  const Q = (pergunta, opcoes, resp, expl, extra) => Object.assign({ tipo: 'quiz', pergunta, opcoes, resp, expl }, extra || {});
  const VF = (code, pergunta, resp, expl, h) => Q(pergunta, ['Verdadeiro', 'Falso'], resp ? 0 : 1, expl, { code, tag: 'Condições', h });
  const PLACE = (pergunta, sk, resp, expl, extra) => Object.assign({ tipo: 'place', pergunta, sk, resp, expl }, extra || {});

  const M = [];
  const mod = (o) => { M.push(o); return o; };

  /* ====================================================== 1 — Conhecendo */
  mod({
    id: 'm1', titulo: 'Conhecendo o Portugol WebStudio', sub: 'O que é um algoritmo e como usar o editor', icone: '01', track: true,
    dicas: ['Releia a explicação da lição: ela tem a resposta.', 'Pense: o que o computador faz primeiro? E o que mostra para você?', 'Observe o mapa da tela: editor, botão Executar e console.'],
    exemplo: W('escreva("Olá, mundo!")'),
    licao: `
<h3>O que é um algoritmo?</h3>
<p>Um <b>algoritmo</b> é uma sequência de passos para resolver um problema — como uma receita de bolo. Quem executa os passos aqui é o computador, e ele faz <b>exatamente</b> o que está escrito, na ordem escrita, de cima para baixo.</p>
<h3>O que é Portugol?</h3>
<p><b>Portugol</b> é uma linguagem de programação com palavras em português, criada para quem está aprendendo lógica. O <b>Portugol WebStudio</b> é um editor online onde você escreve o algoritmo e clica em executar para ver o resultado.</p>
<h3>Mapa da tela</h3>
<div class="map">
  <div><b>Editor</b><span>onde você escreve o código. Cada linha tem um número.</span></div>
  <div><b>Executar</b><span>o computador lê o código e faz o que ele pede.</span></div>
  <div><b>Console</b><span>a "tela do programa": mostra o que o escreva() mandou e recebe o que você digita no leia().</span></div>
  <div><b>Memória</b><span>mostra as variáveis (caixinhas onde o programa guarda informações).</span></div>
  <div><b>Professor</b><span>explica seus erros com palavras simples.</span></div>
</div>
${NOTE('<b>Nosso ciclo de aprendizagem:</b> ENTENDER → IDENTIFICAR → POSICIONAR → ESCREVER → EXECUTAR → CORRIGIR. Você vai errar bastante, e isso faz parte: cada erro explicado é uma lição.', 'ok')}
<h3>Seu primeiro programa</h3>
<p>Não se preocupe em entender cada palavra agora. Clique em <b>Testar no editor</b>, execute e veja o texto aparecer no console.</p>
${C(W('escreva("Olá, mundo!")'), 'Exemplo 1 — Olá, mundo!')}`,
    ex: [
      Q('O que é um algoritmo?', ['Uma sequência de passos para resolver um problema', 'Um tipo de computador', 'Um programa de desenho', 'Uma peça do teclado'], 0, 'Algoritmo é uma sequência organizada de passos, como uma receita. O código em Portugol é como escrevemos esses passos para o computador.', {
        h: ['Pense em uma receita de bolo ou em um manual de instruções.', 'Programar é escrever passos organizados para o computador seguir e resolver uma tarefa.']
      }),
      Q('Em que ordem o computador executa os comandos que você digita?', ['De baixo para cima', 'Em ordem aleatória', 'De cima para baixo, linha por linha', 'Primeiro as palavras maiores'], 2, 'O computador lê e executa da primeira linha até a última, exatamente na ordem em que você escreveu.', {
        h: ['Imagine como você lê as linhas de uma página de caderno.', 'O programa começa na linha 1 e desce executando uma linha após a outra.']
      }),
      {
        tipo: 'code', titulo: 'Digite seu primeiro escreva()', enunciado: 'Dentro de <code>funcao inicio()</code>, digite: <code>escreva("Olá, mundo!")</code>',
        starter: W('// Digite seu comando abaixo:\n'),
        rules: [R.usa('escreva'), R.out([], /Ol[aá],\s*mundo!?/i, 'Mostra a mensagem "Olá, mundo!" na tela', 'Confira se escreveu Olá, mundo! dentro das aspas.')],
        sol: W('escreva("Olá, mundo!")'),
        h: ['Digite o comando na linha em branco logo abaixo do comentário, dentro das chaves de funcao inicio().', 'Escreva a palavra escreva, abra parênteses e coloque o texto entre aspas duplas: escreva("...")'],
        ex: 'escreva("Bem-vindo!")'
      },
      {
        tipo: 'code', titulo: 'Mostre "Portugol Fácil"', enunciado: 'Use o comando <code>escreva()</code> para mostrar na tela: <b>Portugol Fácil</b>',
        starter: W(''),
        rules: [R.usa('escreva'), R.out([], /Portugol\s+F[aá]cil/i, 'Mostra "Portugol Fácil" na tela')],
        sol: W('escreva("Portugol Fácil")'),
        h: ['Use o mesmo formato do exercício anterior, trocando apenas a frase de dentro das aspas.', 'Não esqueça de abrir e fechar as aspas duplas e os parênteses em volta da frase.'],
        ex: 'escreva("Lógica de Programação")'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Conserte a sintaxe', enunciado: 'Faltou fechar o parêntese <code>)</code> no final do comando abaixo. Corrija a linha e clique em <b>Verificar</b>.',
        starter: W('escreva("Consegui programar!"'),
        rules: [R.usa('escreva'), R.out([], /Consegui programar/i, 'Mostra "Consegui programar!" sem erros de sintaxe')],
        sol: W('escreva("Consegui programar!")'),
        h: ['Olhe o final da linha 5, logo depois da segunda aspa dupla.', 'Todo parêntese aberto com ( precisa ser fechado com ) no fim do comando.'],
        ex: 'escreva("Texto completo!")'
      }
    ]
  });

  /* ====================================================== 2 — Estrutura */
  const ESQ = `programa\n{\n    funcao inicio()\n    {\n\n    }\n}`;
  mod({
    id: 'm2', titulo: 'Estrutura básica do programa', sub: 'programa, funcao inicio() e as chaves { }', icone: '02', track: true,
    dicas: ['Todo programa começa com a palavra programa e uma chave { logo abaixo.', 'A função inicio() fica DENTRO das chaves do programa e tem as suas próprias chaves.', 'Cada { precisa de um } correspondente. Conte quantas abrem e quantas fecham.'],
    exemplo: ESQ,
    licao: `
<h3>A estrutura que todo algoritmo tem</h3>
<p>Todo programa em Portugol tem sempre o mesmo "esqueleto". Aprenda ele de cor — você vai escrevê-lo em todo exercício:</p>
${C(ESQ, 'Esqueleto básico')}
<div class="widget" data-widget="anatomia"></div>
<h3>As chaves { } delimitam blocos</h3>
<p>Uma <b>chave de abertura</b> <code>{</code> diz "aqui começa um bloco". A <b>chave de fechamento</b> <code>}</code> diz "aqui termina". Pense em caixas dentro de caixas: a caixa pequena (<code>inicio</code>) fica dentro da caixa grande (<code>programa</code>), e você precisa fechar as duas — a de dentro primeiro.</p>
${NOTE('<b>Regra de ouro:</b> a quantidade de <code>{</code> deve ser igual à de <code>}</code>. No editor, uma chave sem par fica <u style="text-decoration-color:#f87171">sublinhada em vermelho</u>.', 'warn')}
<h3>Erros intencionais — veja o que o Professor explica</h3>
${BAD('programa\n{\n    funcao inicio()\n    {\n        escreva("Olá mundo!")\n}', 'Está faltando uma chave de fechamento. Verifique se a função e o programa foram fechados corretamente.')}
${BAD('programa\n{\n    funcao inicio\n    {\n        escreva("Olá")\n    }\n}', 'A função inicio precisa dos parênteses: inicio().')}`,
    ex: [
      PLACE('Clique na palavra que identifica o <b>início do programa</b>.', ['##a|programa', '##b|{', '##c|    funcao inicio()', '##d|    {', '##e|    }', '##f|}'], 'a', {
        a: 'Correto! A palavra <code>programa</code> marca onde o programa começa. Ela sempre vem primeiro, sozinha na linha.',
        b: 'Essa chave abre o corpo do programa, mas a palavra que "dá nome" ao início é <code>programa</code>, na linha de cima.',
        c: 'Isso é a função principal, que fica DENTRO do programa. Quem começa tudo é <code>programa</code>.',
        d: 'Essa chave abre o bloco da função inicio. O início do programa é a palavra <code>programa</code>.',
        e: 'Essa chave fecha a função, ou seja, é um fim, não um começo.', f: 'Essa chave fecha o programa — é o fim. O início é a palavra <code>programa</code>.'
      }, { fase: 'IDENTIFICAR', h: ['Procure a primeira palavra que abre todo algoritmo em Portugol.', 'Ela aparece sozinha na primeira linha do código, antes da primeira chave {.'] }),
      PLACE('Clique na linha que indica <b>onde começa a execução principal</b> do programa.', ['##a|programa', '##b|{', '##c|    funcao inicio()', '##d|    {', '##e|    }', '##f|}'], 'c', {
        c: 'Correto! <code>funcao inicio()</code> é o ponto de partida: o computador começa a executar os comandos que estão dentro das chaves dela.',
        _: 'Não é essa. A execução principal começa em <code>funcao inicio()</code>. As demais linhas apenas organizam e delimitam o programa.'
      }, { fase: 'IDENTIFICAR', h: ['O computador procura uma função principal para saber por onde começar a rodar.', 'Procure a linha que traz a palavra funcao seguida de parênteses ().'] }),
      {
        tipo: 'code', fase: 'ESCREVER', titulo: 'Complete as chaves', enunciado: 'Este programa está <b>incompleto</b>: faltam as duas chaves <code>}</code> de fechamento no final. Complete a estrutura e clique em <b>Verificar</b>.',
        starter: 'programa\n{\n    funcao inicio()\n    {\n        // Os comandos virão aqui\n',
        rules: [R.ok('Todas as chaves abertas foram fechadas'), R.ok('Estrutura programa → funcao inicio() completa')],
        sol: ESQ + '\n',
        h: ['Conte as chaves: há duas chaves abertas { (uma de programa e uma de funcao inicio), mas nenhuma fechada.', 'Adicione duas linhas no final: primeiro } para fechar funcao inicio(), e depois outro } para fechar programa.'],
        ex: ESQ
      },
      PLACE('Onde ficam os <b>comandos</b> que o computador vai executar?', ['@@antes|0|aqui?', 'programa', '{', '@@entre|4|aqui?', '    funcao inicio()', '    {', '@@dentro|8|aqui?', '    }', '@@fimfunc|4|aqui?', '}', '@@depois|0|aqui?'], 'dentro', {
        dentro: 'Correto! Os comandos ficam entre as chaves da função <code>inicio()</code>. É lá que o computador executa passo a passo.',
        antes: 'Antes de <code>programa</code> o computador ainda nem sabe que um programa começou.', entre: 'Entre <code>programa {</code> e <code>funcao inicio()</code> não há função rodando: comandos aqui não seriam executados.',
        fimfunc: 'Depois do fechamento da função, o comando ficaria fora de <code>inicio()</code>, onde ninguém o executa.', depois: 'Depois da última chave, o programa já terminou.'
      }, { fase: 'POSICIONAR', h: ['Os comandos nunca ficam soltos fora da função principal.', 'Clique no espaço que está entre { e } de funcao inicio().'] }),
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija a estrutura', enunciado: 'Esta estrutura tem <b>dois erros</b> (nos parênteses da função e no fechamento das chaves). Corrija-os para mostrar <b>Olá</b>.',
        starter: 'programa\n{\n    funcao inicio\n    {\n        escreva("Olá")\n    }\n',
        rules: [R.out([], /Olá/, 'Mostra Olá')],
        sol: W('escreva("Olá")'),
        h: ['Olhe a linha 3: toda função precisa de abrir e fechar parênteses logo após o nome.', 'Depois conte as chaves { e }: foram abertas duas chaves, mas só uma foi fechada no final.'],
        ex: 'programa\n{\n    funcao inicio()\n    {\n        escreva("Oi")\n    }\n}'
      },
      {
        tipo: 'code', fase: 'ESCREVER', titulo: 'Crie seu primeiro programa', enunciado: 'Escreva do zero toda a estrutura (<code>programa</code>, <code>funcao inicio()</code> e chaves) e use <code>escreva()</code> para mostrar uma mensagem qualquer.',
        starter: '',
        rules: [R.usa('escreva'), R.saida()],
        sol: W('escreva("Meu primeiro programa!")'),
        h: ['Comece com programa e abra {; dentro dele escreva funcao inicio() e abra outra chave {.', 'Dentro de funcao inicio(), coloque um escreva("sua mensagem") e feche as duas chaves } no final.'],
        ex: 'programa\n{\n    funcao inicio()\n    {\n        escreva("Pronto!")\n    }\n}'
      },
      {
        tipo: 'order', titulo: 'Monte a estrutura', enunciado: 'Coloque as linhas do programa na <b>ordem correta</b> usando as setas.',
        linhas: ['programa', '{', '    funcao inicio()', '    {', '        escreva("Olá")', '    }', '}'],
        dica: 'Pense em caixas: programa abre primeiro, depois a função, depois o comando, e os fechamentos vêm de dentro para fora.',
        h: ['A primeira linha é sempre programa, seguida pela chave { que abre o programa.', 'Depois vem funcao inicio(), sua chave {, o comando escreva("Olá") no meio, e as duas chaves } fechando no final.']
      }
    ]
  });

  /* ====================================================== 3 — escreva */
  mod({
    id: 'm3', titulo: 'Comando escreva()', sub: 'Mostrando informações na tela', icone: '03', track: true,
    dicas: ['O comando se escreve: escreva( ... ) — não esqueça de abrir e fechar o parêntese.', 'Textos ficam entre aspas duplas. Números e contas não precisam de aspas.', 'Para mostrar vários itens no mesmo escreva, separe-os com vírgula.'],
    exemplo: W('escreva("Texto aqui")\nescreva(2 + 3)'),
    licao: `
<h3>O que o escreva faz?</h3>
<p>O comando <code>escreva</code> é utilizado para <b>mostrar informações na tela</b> (no console). Tudo que você colocar dentro dele será exibido.</p>
${C(W('escreva("Olá, mundo!")'), 'Exemplo')}
<h3>Para que servem os parênteses e as aspas?</h3>
<div class="cols">
<div class="card"><b>( )  Parênteses</b><p>Mostram onde começa e termina o que será escrito. É como entregar um objeto numa caixinha: <code>escreva(</code> abre a caixa e <code>)</code> fecha.</p></div>
<div class="card"><b>" "  Aspas</b><p>Dizem ao computador: "isto é um <u>texto</u>, mostre exatamente como está". Sem aspas ele pensa que é o nome de uma variável.</p></div>
</div>
<h3>Mais exemplos</h3>
${C(W('escreva("Tenho ", 17, " anos")\nescreva("\\n")\nescreva("5 + 3 = ", 5 + 3)'), 'Vários itens e contas')}
<p><code>\\n</code> dentro de um texto significa <b>pular linha</b>. Sem ele, o próximo escreva continua na mesma linha.</p>
<h3>Erros frequentes</h3>
${BAD('escreva("Olá"', 'Faltou fechar o parêntese. Todo parêntese aberto precisa de um fechamento.')}
${BAD('escreva Olá', 'Faltaram os parênteses e as aspas. O correto é escreva("Olá").')}
${OKB('escreva("Olá")', 'Exemplo correto: comando, parênteses, aspas abrindo e fechando.')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Exiba a mensagem "Olá"', enunciado: 'Use <code>escreva()</code> para exibir na tela a palavra <b>Olá</b>.',
        starter: W(''),
        rules: [R.usa('escreva'), R.out([], /Ol[aá]/i, 'Mostra "Olá"')],
        sol: W('escreva("Olá")'),
        modelo: { inline: 'escreva("Texto")' },
        h: ['Como "Olá" é um texto, ele precisa ficar entre aspas duplas dentro dos parênteses.', 'Digite escreva("...") colocando a palavra pedida dentro das aspas.'],
        ex: 'escreva("Bom dia")'
      },
      {
        tipo: 'code', titulo: 'Exiba seu nome', enunciado: 'Use <code>escreva()</code> para exibir <b>o seu nome</b> na tela.',
        starter: W(''),
        rules: [R.usa('escreva'), R.strs(1, 'Mostra um texto entre aspas'), R.saida()],
        sol: W('escreva("Anderson")'),
        modelo: { inline: 'escreva("Seu nome")' },
        h: ['Nomes são textos, então precisam estar entre aspas duplas " ".', 'Coloque seu nome dentro das aspas de escreva("...").'],
        ex: 'escreva("Maria")'
      },
      {
        tipo: 'code', titulo: 'Frase completa na tela', enunciado: 'Exiba exatamente esta frase na tela: <b>Estou aprendendo programação</b>',
        starter: W(''),
        rules: [R.usa('escreva'), R.out([], /Estou aprendendo programação/, 'Mostra a frase correta', 'Confira se escreveu a frase completa, incluindo o til e o cedilha em "programação".')],
        sol: W('escreva("Estou aprendendo programação")'),
        modelo: { inline: 'escreva("Sua frase aqui")' },
        h: ['Copie ou digite a frase exatamente como está em negrito, cuidando da acentuação em "programação".', 'Mantenha toda a frase dentro de um único par de aspas duplas no escreva("...").'],
        ex: 'escreva("Gosto de lógica")'
      },
      {
        tipo: 'code', titulo: 'Duas mensagens em linhas separadas', enunciado: 'Mostre <b>duas mensagens diferentes</b> em linhas separadas. Use <code>\\n</code> dentro do texto para pular para a linha de baixo.',
        starter: W(''),
        rules: [
          R.usa('escreva'),
          R.out([], o => {
            const ls = o.trim().split('\n').map(x => x.trim()).filter(Boolean);
            return ls.length >= 2 && new Set(ls.map(x => x.toLowerCase())).size >= 2;
          }, 'Mostra duas mensagens diferentes em linhas separadas', 'Use "\\n" para quebrar a linha e escreva duas frases diferentes (uma em cima e outra embaixo).')
        ],
        sol: W('escreva("Primeira mensagem")\nescreva("\\nSegunda mensagem")'),
        modelo: { inline: 'escreva("Linha 1\\nLinha 2")' },
        h: ['Em Portugol, dois comandos escreva() seguidos ficam grudados na mesma linha se você não usar \\n.', 'Coloque \\n entre a primeira e a segunda frase (em um único escreva ou no início do segundo escreva).'],
        ex: 'escreva("Primeira linha\\nSegunda linha")'
      },
      {
        tipo: 'code', titulo: 'Texto e número na mesma frase', enunciado: 'Use <code>escreva()</code> para mostrar um texto junto com um número — por exemplo: <b>Tenho 17 anos</b>.',
        starter: W(''),
        rules: [R.usa('escreva'), R.out([], /[A-Za-zÀ-ÿ].*\d|\d.*[A-Za-zÀ-ÿ]/, 'Mostra texto e número na mesma saída')],
        sol: W('escreva("Tenho ", 17, " anos")'),
        modelo: { inline: 'escreva("Tenho ", 17, " anos")' },
        h: ['Você pode juntar textos e números no mesmo escreva() separando cada parte com vírgula.', 'Deixe as palavras entre aspas ("Tenho " e " anos") e o número no meio, separado por vírgulas.'],
        ex: 'escreva("Nota: ", 10, " pontos")'
      },
      {
        tipo: 'code', titulo: 'Calcular uma soma no escreva()', enunciado: 'Mostre na tela o resultado da soma <b>15 + 27</b> usando <code>escreva()</code>. Digite a conta <b>sem aspas</b> dentro dos parênteses para o computador calcular (não digite 42 direto).',
        starter: W(''),
        rules: [
          R.usa('escreva'),
          { label: 'Conta escrita sem aspas', test: c => !c.tokens.some(t => t.t === 'str' && /\+/.test(t.v)), fail: 'Você colocou a conta entre aspas. Com aspas o computador mostra o texto "15 + 27" em vez de somar — remova as aspas.' },
          R.op('+'),
          R.semNum(42),
          R.out([], /\b42\b/, 'Mostra o resultado 42 na tela')
        ],
        sol: W('escreva(15 + 27)'),
        modelo: { inline: 'escreva(10 + 5)   // sem aspas: calcula e mostra 15' },
        h: ['Se colocar aspas ("15 + 27"), o computador entende que é texto e não faz a conta. Contas vão SEM aspas.', 'Dentro dos parênteses do escreva(), digite apenas o primeiro número, o sinal + e o segundo número.'],
        ex: 'escreva(10 + 5)'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija os comandos escreva()', enunciado: 'Os dois primeiros comandos <code>escreva</code> estão com erro nos parênteses. Corrija-os para mostrar na tela: <b>Olá! Bem-vindo! Tudo certo?</b>',
        starter: W('escreva("Olá! "\nescreva "Bem-vindo! "\nescreva("Tudo certo?")'),
        rules: [R.cnt('escreva', 3), R.out([], /Ol[aá][\s\S]*Bem-vindo[\s\S]*Tudo certo\?/i, 'Mostra as três mensagens na tela', 'Mantenha os três comandos escreva corrigindo os parênteses dos dois primeiros.')],
        sol: W('escreva("Olá! ")\nescreva("Bem-vindo! ")\nescreva("Tudo certo?")'),
        modelo: { inline: 'escreva("Mensagem")' },
        h: ['Compare as duas primeiras linhas com a terceira linha escreva("Tudo certo?"), que já está correta.', 'Na 1ª linha falta fechar ) no final; na 2ª linha falta abrir ( antes das aspas e fechar ) no final.'],
        ex: 'escreva("Parte 1 ")\nescreva("Parte 2 ")\nescreva("Fim!")'
      }
    ]
  });

  /* ====================================================== 4 — leia */
  const LEIA_EX = W('cadeia nome\n\nescreva("Digite seu nome: ")\nleia(nome)\n\nescreva("Olá, ", nome)');
  mod({
    id: 'm4', titulo: 'Comando leia()', sub: 'Recebendo dados do usuário', icone: '04', track: true,
    dicas: ['Antes do leia, a variável precisa existir: declare o tipo e o nome dela.', 'O leia recebe o NOME da variável, sem aspas: leia(nome).', 'Faça um escreva antes do leia para avisar o usuário o que digitar.'],
    exemplo: W('cadeia nome\nescreva("Seu nome: ")\nleia(nome)'),
    licao: `
<h3>Para que serve o leia?</h3>
<p>O comando <code>leia</code> permite <b>receber informações digitadas pelo usuário</b>. Ele pausa o programa, espera você digitar no console e guarda o valor numa <b>variável</b> (uma caixinha com nome — você verá com detalhes no módulo 5).</p>
${C(LEIA_EX, 'Exemplo completo')}
<p>Ao executar, o campo de entrada do console se habilita: digite e aperte Enter.</p>
<h3>A ordem faz diferença</h3>
<ol><li><b>Declarar</b> a variável (<code>cadeia nome</code>)</li><li><b>Avisar</b> o usuário (<code>escreva</code>)</li><li><b>Ler</b> o dado (<code>leia(nome)</code>)</li><li><b>Usar</b> o dado (<code>escreva("Olá, ", nome)</code>)</li></ol>
<h3>Erros comuns</h3>
${BAD('leia("nome")', 'Você deve informar o nome da variável que receberá o dado, e não escrever o nome dela entre aspas.')}
${BAD('leia(idade)', 'Se a variável idade não foi declarada antes, o computador não sabe onde guardar o dado.')}
${BAD('leia nome', 'Faltaram os parênteses. O correto é leia(nome).')}
${NOTE('<b>Tipo incompatível:</b> se a variável é <code>inteiro</code> e o usuário digita "abc", o programa para e o Professor explica. A variável só aceita o tipo de dado para o qual foi criada.', 'warn')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Solicite o nome', enunciado: 'Declare <code>cadeia nome</code>, use <code>leia(nome)</code> para receber o nome digitado e mostre <b>Olá, </b> seguido do nome.',
        starter: W(''),
        rules: [R.decl('cadeia'), R.usa('leia'), R.out(['Maria'], /Maria/, 'Mostra o nome digitado')],
        sol: LEIA_EX,
        h: ['Siga 3 passos: 1) crie a variável com cadeia nome; 2) leia com leia(nome) sem aspas; 3) mostre com escreva.', 'Para juntar o texto com a variável no final, use vírgula: escreva("Olá, ", nome).'],
        ex: 'cadeia apelido\nleia(apelido)\nescreva("Oi, ", apelido)'
      },
      {
        tipo: 'code', titulo: 'Solicite a idade', enunciado: 'Declare <code>inteiro idade</code>, receba o valor com <code>leia(idade)</code> e mostre a idade na tela com <code>escreva()</code>.',
        starter: W(''),
        rules: [R.decl('inteiro'), R.usa('leia'), R.out(['17'], /17/, 'Mostra a idade digitada')],
        sol: W('inteiro idade\nescreva("Idade: ")\nleia(idade)\nescreva("Você tem ", idade, " anos")'),
        modelo: { inline: 'inteiro idade   ->   leia(idade)   ->   escreva(idade)' },
        h: ['Como idade é um número sem vírgula, declare primeiro: inteiro idade.', 'Depois use leia(idade) sem aspas e mostre a variável com escreva(idade).'],
        ex: 'inteiro ano\nleia(ano)\nescreva("Ano: ", ano)'
      },
      {
        tipo: 'code', titulo: 'Solicite uma cidade', enunciado: 'Declare <code>cadeia cidade</code>, leia o nome da cidade e mostre na tela: <b>Você mora em </b> seguido da cidade.',
        starter: W(''),
        rules: [R.decl('cadeia'), R.usa('leia'), R.out(['Fortaleza'], /Fortaleza/, 'Mostra a cidade digitada')],
        sol: W('cadeia cidade\nescreva("Cidade: ")\nleia(cidade)\nescreva("Você mora em ", cidade)'),
        h: ['Cidade é texto, então declare: cadeia cidade.', 'Use leia(cidade) e depois junte a frase com a variável usando vírgula no escreva().'],
        ex: 'cadeia bairro\nleia(bairro)\nescreva("Bairro: ", bairro)'
      },
      {
        tipo: 'code', titulo: 'Receba dois números', enunciado: 'Declare duas variáveis <code>inteiro</code>, use dois comandos <code>leia()</code> para receber os números e mostre os dois na tela.',
        starter: W(''),
        rules: [R.declNum(2), R.cnt('leia', 2), R.out(['3', '4'], /3[\s\S]*4/, 'Mostra os dois números, na ordem digitada')],
        sol: W('inteiro a\ninteiro b\nescreva("Primeiro: ")\nleia(a)\nescreva("Segundo: ")\nleia(b)\nescreva(a, " e ", b)'),
        h: ['Crie duas variáveis com nomes diferentes (por exemplo: inteiro n1 e inteiro n2).', 'Faça um leia(n1), depois um leia(n2), e por fim mostre as duas variáveis no escreva().'],
        ex: 'inteiro x\ninteiro y\nleia(x)\nleia(y)\nescreva(x, " e ", y)'
      },
      {
        tipo: 'code', titulo: 'Mostre nome e idade juntos', enunciado: 'Declare <code>cadeia nome</code> e <code>inteiro idade</code>, leia os dois valores e mostre uma frase como: <b>Ana tem 20 anos</b>.',
        starter: W(''),
        rules: [R.decl('cadeia'), R.decl('inteiro'), R.cnt('leia', 2), R.out(['Ana', '20'], /Ana[\s\S]*20/, 'Mostra nome e idade')],
        sol: W('cadeia nome\ninteiro idade\nescreva("Nome: ")\nleia(nome)\nescreva("Idade: ")\nleia(idade)\nescreva(nome, " tem ", idade, " anos")'),
        h: ['Você precisa de dois tipos diferentes: cadeia para o nome e inteiro para a idade.', 'Leia primeiro o nome, depois a idade, e separe textos e variáveis por vírgulas dentro do escreva().'],
        ex: 'cadeia curso\ninteiro semestre\nleia(curso)\nleia(semestre)\nescreva(curso, " - semestre ", semestre)'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija o leia', enunciado: 'Corrija os dois erros deste código (aspas indevidas em <code>leia("nome")</code> e falta de declaração para <code>idade</code>) para cumprimentar o usuário.',
        starter: W('cadeia nome\nescreva("Digite seu nome: ")\nleia("nome")\nescreva("Digite sua idade: ")\nleia(idade)\nescreva("Olá, ", nome)'),
        rules: [R.decl('inteiro'), R.out(['Ana', '20'], /Ana/, 'Cumprimenta o usuário')],
        sol: W('cadeia nome\ninteiro idade\nescreva("Digite seu nome: ")\nleia(nome)\nescreva("Digite sua idade: ")\nleia(idade)\nescreva("Olá, ", nome)'),
        h: ['1º erro: dentro do leia() nunca usamos aspas — deve ficar apenas o nome da variável.', '2º erro: a variável idade foi usada em leia(idade), mas não foi declarada no topo com inteiro idade.'],
        ex: 'cadeia aluno\ninteiro serie\nleia(aluno)\nleia(serie)\nescreva("Olá, ", aluno)'
      },
      Q('Uma variável do tipo <code>inteiro</code> vai receber um dado pelo leia, mas o usuário digita <b>abc</b>. O que acontece?', ['O programa converte automaticamente para número', 'O programa para com um aviso de valor incompatível com o tipo', 'A variável fica guardando o texto', 'Nada, o programa ignora'], 1, 'Uma variável inteiro só aceita números inteiros. Ao digitar letras, ocorre erro de incompatibilidade: o tipo da variável define o que ela pode receber.', {
        h: ['Lembre-se: uma variável do tipo inteiro só aceita números inteiros.', 'Quando digitamos letras para uma variável numérica, o Portugol interrompe a execução avisando que o tipo é incompatível.']
      })
    ]
  });

  /* ====================================================== 5 — Variáveis */
  mod({
    id: 'm5', titulo: 'Declaração de variáveis', sub: 'Criando caixinhas para guardar informações', icone: '05', track: true,
    dicas: ['Para declarar: primeiro o TIPO, depois o NOME, na mesma linha.', 'Qual tipo guarda números inteiros? E decimais? E textos?', 'Exemplo de ordem: inteiro idade (tipo → nome).'],
    exemplo: W('inteiro idade\nreal altura\ncadeia nome'),
    licao: `
<h3>O que é uma variável?</h3>
<p>Uma <b>variável</b> é um espaço na memória do computador, com um <b>nome</b>, usado para <b>armazenar uma informação</b> durante a execução do programa. Imagine uma caixinha com uma etiqueta: o nome é a etiqueta, o conteúdo é o que está dentro.</p>
<p>Mas atenção: cada caixinha só aceita um <b>tipo</b> de informação. Por isso, ao criar a variável (declarar), você precisa informar o tipo e o nome:</p>
${C(W('inteiro idade\nreal altura\ncadeia nome\ncaractere letra\nlogico aprovado'), 'Sintaxe: tipo nome')}
<table class="tbl"><thead><tr><th>Tipo</th><th>Utilização</th><th>Exemplo</th></tr></thead><tbody>
<tr><td><code>inteiro</code></td><td>Números inteiros</td><td>15</td></tr>
<tr><td><code>real</code></td><td>Números decimais (com ponto)</td><td>10.5</td></tr>
<tr><td><code>cadeia</code></td><td>Textos</td><td>"Anderson"</td></tr>
<tr><td><code>caractere</code></td><td>Um único caractere</td><td>'A'</td></tr>
<tr><td><code>logico</code></td><td>Verdadeiro ou falso</td><td>verdadeiro</td></tr></tbody></table>
<h3>Caixas de memória — experimente</h3>
<p>Escolha o tipo, dê um nome e coloque um valor. Veja se a caixinha aceita!</p>
<div class="widget" data-widget="mem"></div>
${NOTE('<b>Onde declarar?</b> No começo da função <code>inicio()</code>, antes dos comandos. Declaramos a caixinha antes de usá-la.', 'ok')}
<h3>Erros frequentes</h3>
${BAD('idade inteiro', 'A ordem está invertida. Primeiro informamos o tipo da variável e depois seu nome.')}
${BAD('inteiro idade = "17"', 'Incompatibilidade: inteiro guarda números, mas "17" entre aspas é um texto.')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Variável para a idade', enunciado: 'Declare uma variável para armazenar uma <b>idade</b> (número inteiro).',
        starter: W('// Declare aqui'), rules: [R.decl('inteiro')], sol: W('inteiro idade'),
        h: ['Idades são números inteiros (sem casas decimais), então o tipo correto é inteiro.', 'Escreva primeiro o tipo e depois o nome escolhido para a variável, separados por espaço.'],
        ex: 'inteiro quantidade'
      },
      {
        tipo: 'code', titulo: 'Variável para o nome', enunciado: 'Declare uma variável para armazenar um <b>nome</b> (texto).',
        starter: W('// Declare aqui'), rules: [R.decl('cadeia')], sol: W('cadeia nome'),
        h: ['Em Portugol, palavras e frases (textos) são guardadas no tipo cadeia.', 'Escreva o tipo cadeia seguido de um espaço e do nome da variável.'],
        ex: 'cadeia cidade'
      },
      {
        tipo: 'code', titulo: 'Variável para a altura', enunciado: 'Declare uma variável para armazenar uma <b>altura</b> (como 1.75).',
        starter: W('// Declare aqui'), rules: [R.decl('real')], sol: W('real altura'),
        h: ['Valores com casas decimais (como 1.75) não cabem em inteiro: usam o tipo real.', 'Digite real seguido de um nome para a variável (sem acentos nem espaços).'],
        ex: 'real peso'
      },
      {
        tipo: 'code', titulo: 'Variável para uma nota', enunciado: 'Declare uma variável para armazenar uma <b>nota</b> escolar (como 8.5).',
        starter: W('// Declare aqui'), rules: [R.decl('real')], sol: W('real nota'),
        h: ['Uma nota escolar pode ter décimos (como 8.5), por isso deve usar o tipo real.', 'Escreva primeiro real e depois o nome da variável na mesma linha.'],
        ex: 'real media'
      },
      {
        tipo: 'code', titulo: 'Variável lógica', enunciado: 'Declare uma variável que indique se o aluno foi <b>aprovado</b> (verdadeiro ou falso).',
        starter: W('// Declare aqui'), rules: [R.decl('logico')], sol: W('logico aprovado'),
        h: ['Quando a informação só aceita verdadeiro ou falso, usamos o tipo logico (sem acento!).', 'Digite logico seguido de um espaço e do nome da variável.'],
        ex: 'logico ativo'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija a ordem', enunciado: 'As três declarações abaixo estão com a ordem invertida (nome antes do tipo). Corrija todas.',
        starter: W('idade inteiro\naltura real\nnome cadeia'),
        rules: [R.decl('inteiro'), R.decl('real'), R.decl('cadeia')],
        sol: W('inteiro idade\nreal altura\ncadeia nome'),
        h: ['Em Portugol, toda declaração começa obrigatoriamente pelo TIPO (inteiro, real, cadeia).', 'Inverta as duas palavras de cada uma das três linhas para ficar: tipo nome.'],
        ex: 'inteiro ano\nreal preco\ncadeia curso'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija o tipo do valor', enunciado: 'A variável é <code>inteiro</code>, mas recebeu <code>"17"</code> entre aspas (texto). Corrija mantendo o tipo <code>inteiro</code> e mostre a idade.',
        starter: W('inteiro idade = "17"\nescreva(idade)'),
        rules: [R.decl('inteiro'), R.out([], /17/, 'Mostra 17')],
        sol: W('inteiro idade = 17\nescreva(idade)'),
        h: ['Aspas duplas transformam 17 em texto, e uma variável inteiro só aceita número.', 'Apague apenas as aspas em volta do 17 na primeira linha dentro de inicio().'],
        ex: 'inteiro pontos = 25\nescreva(pontos)'
      }
    ]
  });

  /* ====================================================== 6 — Tipos */
  mod({
    id: 'm6', titulo: 'Tipos de variáveis', sub: 'Qual tipo usar para cada informação?', icone: '06', track: true,
    dicas: ['Números sem vírgula → inteiro. Números com casas decimais → real.', 'Textos entre aspas duplas → cadeia. Uma só letra entre aspas simples → caractere.', 'Só dois valores possíveis (verdadeiro/falso) → logico.'],
    exemplo: W('inteiro idade\nreal altura\ncadeia nome\ncaractere letra\nlogico aprovado'),
    licao: `
<h3>O tipo define o que cabe na caixa</h3>
<p>Escolher o tipo certo é perguntar: <b>que tipo de informação vou guardar?</b></p>
<div class="boxes">
<div class="mbox"><div class="mt">inteiro idade</div><div class="mv">17</div><small>números sem vírgula</small></div>
<div class="mbox"><div class="mt">real altura</div><div class="mv">1.75</div><small>números com decimais</small></div>
<div class="mbox"><div class="mt">cadeia nome</div><div class="mv">"Maria"</div><small>textos</small></div>
<div class="mbox"><div class="mt">caractere letra</div><div class="mv">'A'</div><small>um caractere</small></div>
<div class="mbox"><div class="mt">logico aprovado</div><div class="mv">verdadeiro</div><small>verdadeiro/falso</small></div>
</div>
${NOTE('Cuidado: <code>"17"</code> (com aspas) é <b>texto</b>; <code>17</code> (sem aspas) é <b>número</b>. Decimais usam <b>ponto</b>: 8.5, e não 8,5.', 'warn')}`,
    ex: [
      {
        tipo: 'match', titulo: 'Associe a informação ao tipo', pergunta: 'Para cada informação, escolha o tipo de variável mais adequado.',
        itens: [['Nome', 'cadeia'], ['Idade', 'inteiro'], ['Altura', 'real'], ['Aprovado', 'logico'], ['Inicial do nome', 'caractere']],
        expl: 'Nome é texto (cadeia); idade é número inteiro; altura tem decimais (real); aprovado só pode ser verdadeiro ou falso (logico); uma inicial é um único caractere.',
        h: ['Separe primeiro os números: sem casas decimais é inteiro; com casas decimais (como 1.70) é real.', 'Para letras: várias letras formam cadeia; apenas 1 letra é caractere; sim/não (verdadeiro/falso) é logico.']
      },
      {
        tipo: 'match', titulo: 'Associe o valor ao tipo', pergunta: 'Qual é o tipo de cada valor?',
        itens: [['15', 'inteiro'], ['10.5', 'real'], ['"Anderson"', 'cadeia'], ["'A'", 'caractere'], ['verdadeiro', 'logico']],
        expl: 'Sem ponto e sem aspas → inteiro; com ponto → real; aspas duplas → cadeia; aspas simples com uma letra → caractere; verdadeiro/falso → logico.',
        h: ['Repare nas aspas: aspas duplas "..." indicam cadeia, e aspas simples \'...\' com um símbolo indicam caractere.', 'Nos números sem aspas: se tiver ponto decimal (10.5) é real; sem ponto (15) é inteiro.']
      },
      Q('Qual tipo é o mais adequado para guardar a temperatura <b>36.6</b>?', ['inteiro', 'real', 'cadeia', 'logico'], 1, 'Temperatura com casas decimais pede o tipo real.', {
        h: ['Observe que 36.6 é um número que possui casa decimal (depois do ponto).', 'inteiro só aceita números sem decimais; números com ponto decimal usam real.']
      }),
      Q('O que o <b>tipo</b> de uma variável determina?', ['A cor da variável', 'Quantas linhas o programa tem', 'Que tipo de informação ela pode armazenar', 'Onde ela aparece no console'], 2, 'O tipo funciona como o formato da caixinha: define que tipo de dado cabe nela.', {
        h: ['Lembre da comparação da variável com uma caixa etiquetada na memória.', 'Escolher inteiro, real ou cadeia serve para dizer ao computador que espécie de dado aquela variável aceita guardar.']
      }),
      {
        tipo: 'code', titulo: 'Um de cada tipo', enunciado: 'Declare <b>cinco variáveis</b>, uma de cada tipo: <code>inteiro</code>, <code>real</code>, <code>cadeia</code>, <code>caractere</code> e <code>logico</code>.',
        starter: W('// Declare as cinco variáveis'),
        rules: [R.decl('inteiro'), R.decl('real'), R.decl('cadeia'), R.decl('caractere'), R.decl('logico')],
        sol: W('inteiro a\nreal b\ncadeia c\ncaractere d\nlogico f'),
        h: ['Escreva uma declaração por linha, dando um nome diferente para cada uma das 5 variáveis.', 'Confira a grafia exata dos 5 tipos (todos sem acento): inteiro, real, cadeia, caractere, logico.'],
        ex: 'inteiro qtd\nreal valor\ncadeia item\ncaractere sala\nlogico ativo'
      }
    ]
  });

  /* ====================================================== 7 — Atribuição */
  mod({
    id: 'm7', titulo: 'Atribuição de valores', sub: 'Guardando valores nas variáveis com =', icone: '07', track: true,
    dicas: ['Atribuir é guardar: nome = valor. O sinal = significa "guarde".', 'A variável vem à ESQUERDA do = e o valor à direita.', 'Texto → aspas; número → sem aspas. O valor precisa combinar com o tipo.'],
    exemplo: W('inteiro idade\nidade = 17'),
    licao: `
<h3>O sinal = guarda um valor</h3>
<p>Depois de declarar a variável, podemos guardar um valor nela. Isso se chama <b>atribuição</b>. O sinal <code>=</code> aqui <b>não significa "igual"</b>: significa "guarde o valor da direita na variável da esquerda".</p>
${C(W('inteiro idade\n\nidade = 17\nescreva(idade)'), 'Atribuição')}
<p>Veja o valor entrando na caixinha:</p>
<div class="widget" data-widget="assign"></div>
<h3>= atribui, == compara</h3>
<table class="tbl"><tbody><tr><td><code>idade = 18</code></td><td><b>guarda</b> 18 na variável idade</td></tr><tr><td><code>idade == 18</code></td><td><b>pergunta</b>: o valor de idade é 18? (usa-se em condições)</td></tr></tbody></table>
${BAD('inteiro idade\nidade == 18', 'Aqui o programador queria guardar 18, mas == apenas compara. Para atribuir, use um único =.')}
${NOTE('Você pode <b>trocar</b> o valor quantas vezes quiser: a caixinha guarda sempre o último valor atribuído.', 'ok')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Idade 18', enunciado: 'Declare uma variável <code>inteiro</code> chamada <code>idade</code> e atribua a ela o valor <b>18</b> usando <code>=</code>.',
        starter: W(''),
        rules: [R.decl('inteiro'), R.atrib(1), R.vr('inteiro', 18, 'A memória guarda inteiro com valor 18')],
        sol: W('inteiro idade\nidade = 18'),
        h: ['Primeiro declare a variável com tipo e nome: inteiro idade.', 'Na linha de baixo (ou na mesma linha), use o sinal = para guardar o número sem aspas.'],
        ex: 'inteiro nivel\nnivel = 5'
      },
      {
        tipo: 'code', titulo: 'Nome Carlos', enunciado: 'Declare uma variável <code>cadeia</code> chamada <code>nome</code> e atribua o texto <b>"Carlos"</b>.',
        starter: W(''),
        rules: [R.decl('cadeia'), R.atrib(1), R.vr('cadeia', 'Carlos', 'A memória guarda cadeia com valor "Carlos"')],
        sol: W('cadeia nome\nnome = "Carlos"'),
        h: ['Para guardar um nome, declare a variável com o tipo cadeia.', 'Textos atribuídos a uma variável cadeia precisam estar entre aspas duplas: "Carlos".'],
        ex: 'cadeia cidade\ncidade = "Sobral"'
      },
      {
        tipo: 'code', titulo: 'Nota 8.5', enunciado: 'Declare uma variável <code>real</code> chamada <code>nota</code> e atribua o valor <b>8.5</b> (com ponto).',
        starter: W(''),
        rules: [R.decl('real'), R.atrib(1), R.vr('real', 8.5, 'A memória guarda real com valor 8.5')],
        sol: W('real nota\nnota = 8.5'),
        h: ['Como 8.5 tem casa decimal, declare a variável usando o tipo real.', 'Em Portugol, números decimais usam ponto (8.5) e não vírgula, sem aspas.'],
        ex: 'real altura\naltura = 1.72'
      },
      {
        tipo: 'code', titulo: 'Altere o valor', enunciado: 'Declare <code>inteiro pontos</code>, atribua <b>10</b> e, na linha seguinte, altere o valor de <code>pontos</code> para <b>25</b>.',
        starter: W(''),
        rules: [R.decl('inteiro'), R.atrib(2, 'Atribui duas vezes (valor inicial e alteração)'), R.vr('inteiro', 25, 'No final, a memória guarda 25')],
        sol: W('inteiro pontos\npontos = 10\npontos = 25'),
        h: ['Declare a variável apenas UMA vez no começo (inteiro pontos).', 'Para trocar o valor depois, não repita a palavra inteiro: escreva apenas pontos = 10 e abaixo pontos = 25.'],
        ex: 'inteiro vidas\nvidas = 3\nvidas = 5'
      },
      {
        tipo: 'code', titulo: 'Exiba o conteúdo da variável', enunciado: 'Guarde <b>18</b> em uma variável <code>inteiro</code> e use <code>escreva()</code> passando o <b>nome da variável</b> (sem digitar 18 dentro do escreva).',
        starter: W(''),
        rules: [R.atrib(1), R.usa('escreva'), R.out([], /\b18\b/, 'Mostra 18'), { label: 'Mostra o conteúdo da variável', test: c => { const t = c.tokens; const i = t.findIndex(x => x.v === 'escreva' && x.t === 'kw'); return t.slice(i, i + 6).some(x => x.t === 'id'); }, fail: 'Coloque o NOME da variável dentro do escreva, sem aspas.' }],
        sol: W('inteiro idade\nidade = 18\nescreva(idade)'),
        modelo: { inline: 'escreva(nomeDaVariavel)   // sem aspas!' },
        h: ['Se você escrever escreva("idade") com aspas, aparece a palavra "idade". Sem aspas, aparece o valor guardado nela.', 'Declare a variável, guarde 18 nela com = e chame escreva(nomeDaVariavel).'],
        ex: 'inteiro saldo\nsaldo = 50\nescreva(saldo)'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Atribuição ou comparação?', enunciado: 'O programador queria guardar 18 em <code>idade</code>, mas usou <code>==</code> em vez de <code>=</code>. Corrija e mostre a idade.',
        starter: W('inteiro idade\nidade == 18\nescreva(idade)'),
        rules: [R.vr('inteiro', 18), R.out([], /18/, 'Mostra 18')],
        sol: W('inteiro idade\nidade = 18\nescreva(idade)'),
        h: ['Dois sinais seguidos (==) servem apenas para fazer perguntas em condições.', 'Troque == por um único sinal = na linha onde idade recebe 18.'],
        ex: 'inteiro meta\nmeta = 100\nescreva(meta)'
      },
      Q('Qual linha <b>guarda</b> o valor 20 na variável idade?', ['idade == 20', 'idade = 20', '20 = idade', 'idade := 20'], 1, 'O sinal = atribui (guarda). O == compara, e a variável sempre fica à esquerda.', {
        h: ['Em Portugol, quem recebe o valor fica sempre do lado esquerdo do sinal.', 'Lembre a diferença: um único = guarda o valor; dois sinais == apenas comparam.']
      })
    ]
  });

  /* ====================================================== 8 — Matemáticos */
  const OPS = n => ({ tipo: 'code' });
  mod({
    id: 'm8', titulo: 'Operadores matemáticos', sub: 'Somar, subtrair, multiplicar, dividir', icone: '08', track: true,
    dicas: ['Receba os dois números com leia, guarde o resultado em outra variável e mostre.', 'A conta fica do lado direito de um =: resultado = numero1 + numero2', 'Dividir inteiro por inteiro dá inteiro (10 / 4 = 2). Use real se quiser decimais (10 / 4 = 2.5).'],
    exemplo: W('inteiro a\ninteiro b\ninteiro resultado\n\na = 10\nb = 5\nresultado = a + b\nescreva(resultado)'),
    licao: `
<h3>Operadores</h3>
<table class="tbl"><thead><tr><th>Operador</th><th>Operação</th><th>Exemplo</th></tr></thead><tbody>
<tr><td><code>+</code></td><td>Adição</td><td>7 + 3 → 10</td></tr><tr><td><code>-</code></td><td>Subtração</td><td>7 - 3 → 4</td></tr>
<tr><td><code>*</code></td><td>Multiplicação</td><td>7 * 3 → 21</td></tr><tr><td><code>/</code></td><td>Divisão</td><td>10 / 4 → 2.5 (com real)</td></tr>
<tr><td><code>%</code></td><td>Resto da divisão</td><td>10 % 3 → 1</td></tr></tbody></table>
${C(W('inteiro numero1\ninteiro numero2\ninteiro resultado\n\nnumero1 = 10\nnumero2 = 5\n\nresultado = numero1 + numero2\n\nescreva(resultado)'), 'Exemplo: somando')}
${NOTE('<b>Cuidado com a divisão:</b> se as duas variáveis são <code>inteiro</code>, o resultado é inteiro (10 / 4 dá 2, a parte decimal é descartada). Use <code>real</code> para ver 2.5.', 'warn')}
<p>A conta sempre fica do <b>lado direito</b> do =. O resultado é guardado na variável da esquerda. A ordem de cálculo é a da matemática: <code>*</code>, <code>/</code> e <code>%</code> antes de <code>+</code> e <code>-</code>; use parênteses para mudar.</p>`,
    ex: [
      {
        tipo: 'code', titulo: 'Somar dois números', enunciado: 'As variáveis já estão declaradas. Leia <code>n1</code> e <code>n2</code> com <code>leia()</code>, calcule a soma em <code>soma</code> e mostre o resultado.',
        starter: W('inteiro n1\ninteiro n2\ninteiro soma\n\n'),
        rules: [R.cnt('leia', 2), R.op('+'), R.out(['10', '5'], /\b15\b/, 'Para 10 e 5 mostra 15'), R.out(['3', '4'], /\b7\b/, 'Para 3 e 4 mostra 7')],
        sol: W('inteiro n1\ninteiro n2\ninteiro soma\nleia(n1)\nleia(n2)\nsoma = n1 + n2\nescreva(soma)'),
        h: ['Primeiro receba os dois valores digitados usando leia(n1) e leia(n2).', 'Depois guarde o cálculo com soma = n1 + n2 e exiba a variável soma com escreva(soma).'],
        ex: 'inteiro a\ninteiro b\ninteiro total\nleia(a)\nleia(b)\ntotal = a + b\nescreva(total)'
      },
      {
        tipo: 'code', titulo: 'Subtrair dois números', enunciado: 'Declare duas variáveis numéricas, receba os valores com <code>leia()</code> e mostre a <b>subtração</b> do primeiro pelo segundo (<code>-</code>).',
        starter: W(''),
        rules: [R.cnt('leia', 2), R.op('-'), R.out(['10', '4'], /\b6\b/, 'Para 10 e 4 mostra 6'), R.out(['9', '2'], /\b7\b/, 'Para 9 e 2 mostra 7')],
        sol: W('inteiro a\ninteiro b\nleia(a)\nleia(b)\nescreva(a - b)'),
        h: ['Declare duas variáveis inteiro (ex.: a e b) e leia as duas com leia(a) e leia(b).', 'Use o operador - para subtrair o segundo do primeiro: a - b (em uma variável ou direto no escreva).'],
        ex: 'inteiro x\ninteiro y\nleia(x)\nleia(y)\nescreva(x - y)'
      },
      {
        tipo: 'code', titulo: 'Multiplicar dois números', enunciado: 'Receba dois números com <code>leia()</code> e mostre o resultado da <b>multiplicação</b> usando <code>*</code>.',
        starter: W(''),
        rules: [R.cnt('leia', 2), R.op('*'), R.out(['6', '7'], /\b42\b/, 'Para 6 e 7 mostra 42'), R.out(['3', '5'], /\b15\b/, 'Para 3 e 5 mostra 15')],
        sol: W('inteiro a\ninteiro b\nleia(a)\nleia(b)\nescreva(a * b)'),
        h: ['Em programação, multiplicar usa o asterisco * (e não a letra x).', 'Declare duas variáveis, leia ambas com leia() e mostre o produto com escreva(a * b).'],
        ex: 'inteiro base\ninteiro altura\nleia(base)\nleia(altura)\nescreva(base * altura)'
      },
      {
        tipo: 'code', titulo: 'Dividir dois números com decimais', enunciado: 'Receba dois números do tipo <code>real</code> e mostre a <b>divisão</b> (<code>/</code>). Para 10 e 4 o resultado deve ser <b>2.5</b>.',
        starter: W(''),
        rules: [R.cnt('leia', 2), R.op('/'), R.out(['10', '4'], /\b2\.5\b/, 'Para 10 e 4 mostra 2.5', 'Se você usou inteiro, a parte decimal foi descartada. Declare as variáveis como real.'), R.out(['9', '2'], /\b4\.5\b/, 'Para 9 e 2 mostra 4.5')],
        sol: W('real a\nreal b\nleia(a)\nleia(b)\nescreva(a / b)'),
        h: ['Se usar inteiro, 10 / 4 vira 2 e perde o .5! Declare as variáveis com o tipo real.', 'Leia os dois valores com leia() e divida o primeiro pelo segundo usando a barra /.'],
        ex: 'real valor\nreal partes\nleia(valor)\nleia(partes)\nescreva(valor / partes)'
      },
      {
        tipo: 'code', titulo: 'Média de duas notas', enunciado: 'Receba duas notas (<code>real</code>), calcule a <b>média</b> somando as duas entre parênteses antes de dividir por 2, e mostre o resultado.',
        starter: W(''),
        rules: [R.cnt('leia', 2), R.op('+'), R.op('/'), R.out(['7', '8'], /\b7\.5\b/, 'Para 7 e 8 mostra 7.5', 'Confira os parênteses: (nota1 + nota2) / 2, e use o tipo real.'), R.out(['10', '6'], /\b8(\.0)?\b/, 'Para 10 e 6 mostra 8')],
        sol: W('real n1\nreal n2\nreal media\nleia(n1)\nleia(n2)\nmedia = (n1 + n2) / 2\nescreva(media)'),
        modelo: { inline: 'media = (n1 + n2) / 2' },
        h: ['Sem parênteses, n1 + n2 / 2 divide apenas n2 por 2! Os parênteses obrigam a somar primeiro.', 'Declare n1, n2 e media como real, leia as duas notas, calcule (n1 + n2) / 2 e mostre media.'],
        ex: 'real a\nreal b\nreal m\nleia(a)\nleia(b)\nm = (a + b) / 2\nescreva(m)'
      },
      {
        tipo: 'code', titulo: 'Resto da divisão', enunciado: 'Receba um número <code>inteiro</code> e mostre o <b>resto</b> da divisão dele por <b>5</b> usando o operador <code>%</code>.',
        starter: W(''),
        rules: [R.usa('leia'), R.op('%'), R.out(['17'], /\b2\b/, '17 % 5 = 2'), R.out(['20'], /\b0\b/, '20 % 5 = 0')],
        sol: W('inteiro n\nleia(n)\nescreva(n % 5)'),
        modelo: { inline: 'resto = numero % 5' },
        h: ['O operador % entrega o que sobra de uma divisão inteira (por exemplo, 17 dividido por 5 dá 3 e sobram 2).', 'Declare um inteiro, leia o valor com leia() e mostre o cálculo usando % 5.'],
        ex: 'inteiro num\nleia(num)\nescreva(num % 2)'
      }
    ]
  });

  /* ====================================================== 9 — Relacionais */
  mod({
    id: 'm9', titulo: 'Operadores relacionais', sub: 'Comparando valores: o resultado é verdadeiro ou falso', icone: '09', track: true,
    dicas: ['Um operador relacional compara dois valores e responde verdadeiro ou falso.', 'Substitua a variável pelo valor dela antes de comparar.', '>= significa "maior OU igual"; == significa "é igual a".'],
    exemplo: W('escreva(10 > 5)'),
    licao: `
<h3>Perguntas com resposta verdadeiro ou falso</h3>
<p>Operadores relacionais <b>comparam</b> dois valores. O resultado é sempre <code>verdadeiro</code> ou <code>falso</code>.</p>
<table class="tbl"><thead><tr><th>Operador</th><th>Significado</th><th>Exemplo (idade = 20)</th></tr></thead><tbody>
<tr><td><code>==</code></td><td>Igual</td><td>idade == 20 → verdadeiro</td></tr><tr><td><code>!=</code></td><td>Diferente</td><td>idade != 20 → falso</td></tr>
<tr><td><code>&gt;</code></td><td>Maior</td><td>idade &gt; 20 → falso</td></tr><tr><td><code>&lt;</code></td><td>Menor</td><td>idade &lt; 20 → falso</td></tr>
<tr><td><code>&gt;=</code></td><td>Maior ou igual</td><td>idade &gt;= 18 → verdadeiro</td></tr><tr><td><code>&lt;=</code></td><td>Menor ou igual</td><td>idade &lt;= 18 → falso</td></tr></tbody></table>
${C(W('inteiro idade\nidade = 20\n\nescreva(idade >= 18)'), 'Mostra o resultado da condição')}
<p>Ao executar programas com <code>se</code>, o painel <b>Condições</b> mostra se cada condição deu verdadeiro ou falso antes de o bloco ser executado.</p>`,
    ex: [
      VF('inteiro idade\nidade = 20', 'A condição <code>idade >= 18</code> é:', true, '20 é maior que 18, portanto idade >= 18 é verdadeiro.', [
        'Substitua mentalmente idade pelo valor guardado nela (20): fica 20 >= 18.',
        'O operador >= significa "maior OU igual". Pergunte: 20 é maior ou igual a 18?'
      ]),
      VF('inteiro nota\nnota = 5', 'A condição <code>nota >= 7</code> é:', false, '5 não é maior nem igual a 7, então a condição é falsa.', [
        'Troque nota por 5 na expressão: fica 5 >= 7.',
        '5 passa de 7 ou é igual a 7? Se não for nenhum dos dois, a condição é falsa.'
      ]),
      VF('inteiro x\nx = 10', 'A condição <code>x != 10</code> é:', false, '!= significa diferente. x vale 10, então "x é diferente de 10" é falso.', [
        'Lembre o significado de != em Portugol: ele pergunta se os dois lados são DIFERENTES.',
        'Como x vale 10, a pergunta é "10 é diferente de 10?".'
      ]),
      VF('inteiro a\ninteiro b\na = 3\nb = 8', 'A condição <code>a < b</code> é:', true, '3 é menor que 8: verdadeiro.', [
        'Substitua as duas variáveis pelos seus valores: a vale 3 e b vale 8, formando 3 < 8.',
        'O símbolo < aponta para o menor lado ("é menor que"). 3 é menor que 8?'
      ]),
      VF('inteiro idade\nidade = 18', 'A condição <code>idade > 18</code> é:', false, '18 não é MAIOR que 18 (é igual). Com >= seria verdadeiro.', [
        'Atenção ao detalhe: o operador usado é > (estritamente maior), sem o sinal de igual!',
        'Substituindo idade por 18, temos 18 > 18. Um número não é maior que ele mesmo.'
      ]),
      {
        tipo: 'code', titulo: 'Mostre uma comparação verdadeira', enunciado: 'Use <code>escreva()</code> com o operador <code>&gt;</code> (sem aspas) para mostrar o resultado de <b>7 &gt; 3</b>. A saída será <i>verdadeiro</i>.',
        starter: W(''),
        rules: [R.op('>'), R.out([], /^\s*verdadeiro\s*$/, 'Mostra verdadeiro')],
        sol: W('escreva(7 > 3)'),
        modelo: { inline: 'escreva(10 > 5)   // sem aspas: mostra verdadeiro' },
        h: ['Assim como nas contas matemáticas, comparações vão SEM aspas dentro do escreva().', 'Coloque a expressão com o sinal > diretamente entre os parênteses do escreva().'],
        ex: 'escreva(10 > 5)'
      },
      {
        tipo: 'code', titulo: 'Mostre uma comparação falsa', enunciado: 'Use <code>escreva()</code> com o operador <code>==</code> (sem aspas) comparando dois números diferentes para a saída mostrar <i>falso</i>.',
        starter: W(''),
        rules: [R.op('=='), R.out([], /^\s*falso\s*$/, 'Mostra falso')],
        sol: W('escreva(5 == 6)'),
        modelo: { inline: 'escreva(4 == 9)   // sem aspas: mostra falso' },
        h: ['O operador == pergunta se dois valores são iguais. Se você comparar dois números diferentes, a resposta será falso.', 'Digite escreva(numero1 == numero2) sem aspas, escolhendo dois números diferentes.'],
        ex: 'escreva(4 == 9)'
      }
    ]
  });

  /* ====================================================== 10 — SE */
  const SE_ESQ = 'SE (condição)\n{\n    FAÇA ISSO\n}\nSENÃO\n{\n    FAÇA AQUILO\n}';
  const SE_EX = W('inteiro idade\n\nescreva("Digite sua idade: ")\nleia(idade)\n\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}\nsenao\n{\n    escreva("Menor de idade")\n}');
  mod({
    id: 'm10', titulo: 'Estrutura SE', sub: 'Executando comandos só quando uma condição é verdadeira', icone: '10', track: true,
    dicas: ['A estrutura é: se (condição) { comandos }. Parênteses na condição, chaves nos comandos.', 'A condição compara um valor: idade >= 18, nota >= 7, numero > 0...', 'Leia o valor ANTES do se: o se usa a variável já preenchida.'],
    exemplo: W('inteiro x\nleia(x)\nse (x > 0)\n{\n    escreva("Positivo")\n}'),
    licao: `
<h3>Tomando decisões</h3>
<p>Até agora o programa executava tudo, sempre. Com o <code>se</code> ele passa a <b>decidir</b>: os comandos dentro do bloco só são executados quando a <b>condição</b> é verdadeira.</p>
<p>Uma <b>condição</b> é uma pergunta com resposta verdadeiro ou falso — como <code>idade >= 18</code> (você aprendeu no módulo anterior).</p>
<pre class="schema">SE (condição)
{
    FAÇA ISSO      ← só roda se a condição for verdadeira
}</pre>
${C(W('inteiro idade\n\nescreva("Digite sua idade: ")\nleia(idade)\n\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}'), 'Só o se')}
<h3>As partes do se</h3>
<ul><li><code>se</code> — a palavra que inicia a decisão.</li><li><code>( )</code> — contêm a condição (obrigatórios).</li><li><code>{ }</code> — delimitam os comandos que dependem da condição.</li></ul>
<h3>Erros comuns</h3>
${BAD('se idade >= 18\n{\n    escreva("Maior")\n}', 'Esqueceu os parênteses da condição: se (idade >= 18).')}
${BAD('se (idade >= 18)\n    escreva("Maior")', 'Esqueceu as chaves { } do bloco.')}
${BAD('se (idade = 18)', 'Dentro da condição, comparar é ==. Um único = tenta guardar valor.')}
${NOTE('Cada <code>{</code> aberta no <code>se</code> precisa de uma <code>}</code> para fechar. Esquecer fecha o bloco errado e o programa inteiro fica desorganizado.', 'warn')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Número positivo', enunciado: 'Leia um número <code>inteiro</code> e, <b>se</b> ele for maior que zero (<code>&gt; 0</code>), mostre <b>Positivo</b>.',
        starter: W(''),
        rules: [R.usa('se'), R.out(['5'], /Positivo/i, 'Para 5 mostra Positivo'), R.out(['-3'], not(/Positivo/i), 'Para -3 não mostra Positivo', 'Para número negativo, nada de "Positivo" deve aparecer.')],
        sol: W('inteiro n\nleia(n)\nse (n > 0)\n{\n    escreva("Positivo")\n}'),
        h: ['Declare um inteiro e use leia() antes do se(), pois precisamos do valor para testar a condição.', 'Monte se (n > 0) e coloque escreva("Positivo") dentro das chaves { } do se.'],
        ex: 'inteiro x\nleia(x)\nse (x > 10)\n{\n    escreva("Maior que 10")\n}'
      },
      {
        tipo: 'code', titulo: 'Maior de idade', enunciado: 'Leia a idade (<code>inteiro</code>) e, <b>se</b> for maior ou igual a 18 (<code>&gt;= 18</code>), mostre <b>Maior de idade</b>.',
        starter: W(''),
        rules: [R.usa('se'), R.out(['20'], /Maior de idade/i, '20 → Maior de idade'), R.out(['18'], /Maior de idade/i, '18 → Maior de idade (cuidado com >=)'), R.out(['10'], not(/Maior/i), '10 → nada', 'Para menor de 18 nada deve ser mostrado.')],
        sol: W('inteiro idade\nleia(idade)\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}'),
        h: ['Cuidado com o caso de quem tem exatamente 18 anos: use >= 18 (e não apenas > 18).', 'Não coloque senao: quando for menor de 18, o programa simplesmente não mostra nada.'],
        ex: 'inteiro anos\nleia(anos)\nse (anos >= 16)\n{\n    escreva("Pode votar")\n}'
      },
      {
        tipo: 'code', titulo: 'Aluno aprovado', enunciado: 'Leia uma nota (<code>real</code>). <b>Se</b> for maior ou igual a 7 (<code>&gt;= 7</code>), mostre <b>Aprovado</b>.',
        starter: W(''),
        rules: [R.usa('se'), R.out(['8'], /Aprovado/i, '8 → Aprovado'), R.out(['7'], /Aprovado/i, '7 → Aprovado'), R.out(['5.5'], not(/Aprovado/i), '5.5 → nada', 'Nota abaixo de 7 não deve mostrar Aprovado.')],
        sol: W('real nota\nleia(nota)\nse (nota >= 7)\n{\n    escreva("Aprovado")\n}'),
        h: ['Notas podem ter decimais (como 5.5), então declare a variável com o tipo real.', 'Leia a variável e use se (nota >= 7) com chaves { } envolvendo o escreva("Aprovado").'],
        ex: 'real media\nleia(media)\nse (media >= 6)\n{\n    escreva("Passou")\n}'
      },
      {
        tipo: 'code', titulo: 'Comparar dois números', enunciado: 'Leia dois números <code>inteiro</code>. <b>Se</b> forem iguais (<code>==</code>), mostre <b>Iguais</b>.',
        starter: W(''),
        rules: [R.cnt('leia', 2), R.usa('se'), R.op('=='), R.out(['4', '4'], /Iguais/i, '4 e 4 → Iguais'), R.out(['4', '5'], not(/Iguais/i), '4 e 5 → nada')],
        sol: W('inteiro a\ninteiro b\nleia(a)\nleia(b)\nse (a == b)\n{\n    escreva("Iguais")\n}'),
        h: ['Para comparar igualdade dentro da condição do se(), use DOIS sinais de igual: ==.', 'Declare duas variáveis, faça dois comandos leia() e teste se (a == b) { escreva("Iguais") }.'],
        ex: 'inteiro x\ninteiro y\nleia(x)\nleia(y)\nse (x == y)\n{\n    escreva("Mesmo valor")\n}'
      },
      {
        tipo: 'code', titulo: 'Senha correta', enunciado: 'Leia uma senha (<code>cadeia</code>). <b>Se</b> for igual a <code>"1234"</code>, mostre <b>Acesso liberado</b>.',
        starter: W(''),
        rules: [R.decl('cadeia'), R.usa('se'), R.out(['1234'], /liberado/i, 'Senha 1234 → Acesso liberado'), R.out(['abc'], not(/liberado/i), 'Senha abc → nada')],
        sol: W('cadeia senha\nleia(senha)\nse (senha == "1234")\n{\n    escreva("Acesso liberado")\n}'),
        h: ['Como a senha pode ter letras ou textos, declare: cadeia senha.', 'Na condição, compare a variável com o texto entre aspas usando ==: se (senha == "1234").'],
        ex: 'cadeia codigo\nleia(codigo)\nse (codigo == "vip")\n{\n    escreva("Liberado")\n}'
      },
      {
        tipo: 'order', titulo: 'Monte o programa com SE', enunciado: 'Organize as linhas na ordem correta: o programa lê uma idade e mostra "Maior de idade" quando ela for ≥ 18.',
        linhas: ['programa', '{', '    funcao inicio()', '    {', '        inteiro idade', '        escreva("Digite sua idade: ")', '        leia(idade)', '        se (idade >= 18)', '        {', '            escreva("Maior de idade")', '        }', '    }', '}'],
        dica: 'A variável é declarada primeiro; o usuário é avisado, depois o dado é lido; só então o se pode usar a idade. As chaves fecham de dentro para fora.',
        h: ['Comece abrindo programa { e funcao inicio() {. Logo dentro de inicio(), declare inteiro idade.', 'Depois avise com escreva, leia com leia(idade), abra o bloco se (idade >= 18) { ... } e feche as três chaves } no fim.']
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija a condição', enunciado: 'Faltaram os parênteses obrigatórios em volta da condição do <code>se</code>. Corrija e verifique.',
        starter: W('inteiro idade\nescreva("Digite sua idade: ")\nleia(idade)\nse idade >= 18\n{\n    escreva("Maior de idade")\n}'),
        rules: [R.out(['20'], /Maior de idade/, '20 → Maior de idade'), R.out(['10'], not(/Maior/), '10 → nada')],
        sol: SE_EX.replace('senao\n        {\n            escreva("Menor de idade")\n        }\n', '').replace('\n        }\n\n    }', '\n        }\n    }'),
        h: ['Olhe a linha do comando se: a condição está solta sem parênteses.', 'Envolva a comparação entre parênteses: se (idade >= 18).'],
        ex: 'se (pontos >= 10)\n{\n    escreva("Venceu")\n}'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija comparação e chaves', enunciado: 'Este <code>se</code> tem dois erros: usou <code>=</code> em vez de <code>==</code> na condição e esqueceu as chaves <code>{ }</code> do bloco. Corrija.',
        starter: W('inteiro nota\nleia(nota)\nse (nota = 7)\n    escreva("Nota exatamente 7")'),
        rules: [R.out(['7'], /exatamente 7/, '7 → Nota exatamente 7'), R.out(['6'], not(/exatamente/), '6 → nada')],
        sol: W('inteiro nota\nleia(nota)\nse (nota == 7)\n{\n    escreva("Nota exatamente 7")\n}'),
        h: ['1º erro: dentro de se (...), troque o sinal = por == para comparar se nota é igual a 7.', '2º erro: coloque uma chave { antes do escreva e uma chave } depois dele.'],
        ex: 'se (nivel == 1)\n{\n    escreva("Iniciante")\n}'
      }
    ]
  });
  // sol do ex. 7 do m10 calculada por substituição: garantir fallback
  M[M.length - 1].ex[6].sol = W('inteiro idade\nescreva("Digite sua idade: ")\nleia(idade)\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}');

  /* ====================================================== 11 — SENAO */
  mod({
    id: 'm11', titulo: 'Estrutura SENÃO', sub: 'O que fazer quando a condição é falsa', icone: '11', track: true,
    dicas: ['O senao vem DEPOIS da chave } do se, sem nada no meio.', 'O senao também tem as suas chaves { } com os comandos.', 'Só um dos dois blocos é executado: ou o do se, ou o do senao.'],
    exemplo: W('se (x > 0)\n{\n    escreva("Positivo")\n}\nsenao\n{\n    escreva("Não positivo")\n}'),
    licao: `
<h3>O "caso contrário"</h3>
<p>O <code>senao</code> define o que fazer <b>quando a condição do se é falsa</b>. Ele não tem condição própria: é a alternativa.</p>
<pre class="schema">${SE_ESQ}</pre>
${C(SE_EX, 'Maior ou menor de idade')}
<p>Sempre executa <b>um</b> dos dois blocos — nunca os dois. Observe o painel <b>Condições</b> para ver o resultado da pergunta.</p>
<h3>Erros comuns</h3>
${BAD('se (idade >= 18)\n{\n    escreva("Maior")\n}\nescreva("Fim")\nsenao\n{\n    escreva("Menor")\n}', 'O senao está fora da estrutura: há outro comando entre o } do se e o senao. O senao precisa vir logo depois do bloco do se.')}
${BAD('senao\n{\n    escreva("Menor")\n}', 'Senao sem se: o senao só existe junto com um se.')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Maior ou menor de idade', enunciado: 'Leia a idade (<code>inteiro</code>). Mostre <b>Maior de idade</b> se for <code>&gt;= 18</code>; <b>senão</b>, mostre <b>Menor de idade</b>.',
        starter: W(''),
        rules: [R.cnt('se', 1), R.cnt('senao', 1), R.out(['20'], nao(/Maior de idade/i, /Menor/i), '20 → Maior de idade'), R.out(['15'], nao(/Menor de idade/i, /Maior/i), '15 → Menor de idade')],
        sol: SE_EX,
        h: ['Monte o bloco se (idade >= 18) { ... } e, logo após fechar }, escreva senao { ... }.', 'Atenção: a palavra em Portugol não tem til (escreva senao) e não leva condição entre parênteses.'],
        ex: 'inteiro temp\nleia(temp)\nse (temp >= 30)\n{\n    escreva("Quente")\n}\nsenao\n{\n    escreva("Agradável")\n}'
      },
      {
        tipo: 'code', titulo: 'Aprovado ou reprovado', enunciado: 'Leia uma nota (<code>real</code>). Se for <code>&gt;= 7</code>, mostre <b>Aprovado</b>; <b>senão</b>, mostre <b>Reprovado</b>.',
        starter: W(''),
        rules: [R.cnt('senao', 1), R.out(['8'], nao(/\bAprovado/i, /Reprovado/i), '8 → Aprovado'), R.out(['7'], nao(/\bAprovado/i, /Reprovado/i), '7 → Aprovado'), R.out(['4.5'], /Reprovado/i, '4.5 → Reprovado')],
        sol: W('real nota\nleia(nota)\nse (nota >= 7)\n{\n    escreva("Aprovado")\n}\nsenao\n{\n    escreva("Reprovado")\n}'),
        h: ['Use o tipo real para aceitar notas com casas decimais como 4.5.', 'No bloco do se (nota >= 7) mostre "Aprovado", e no bloco do senao mostre "Reprovado".'],
        ex: 'real media\nleia(media)\nse (media >= 6)\n{\n    escreva("Passou")\n}\nsenao\n{\n    escreva("Recuperação")\n}'
      },
      {
        tipo: 'code', titulo: 'Qual é o maior?', enunciado: 'Leia dois números diferentes e mostre apenas <b>o maior</b> deles.',
        starter: W(''),
        rules: [R.cnt('leia', 2), R.cnt('senao', 1), R.out(['3', '9'], nao(/\b9\b/, /\b3\b/), '3 e 9 → 9', 'Mostre apenas o maior valor.'), R.out(['9', '3'], nao(/\b9\b/, /\b3\b/), '9 e 3 → 9')],
        sol: W('inteiro a\ninteiro b\nleia(a)\nleia(b)\nse (a > b)\n{\n    escreva(a)\n}\nsenao\n{\n    escreva(b)\n}'),
        h: ['Leia os dois números em duas variáveis (por exemplo, a e b) e compare: se (a > b).', 'Se a > b for verdadeiro, mostre a variável a (sem aspas); no senao, mostre a variável b.'],
        ex: 'inteiro x\ninteiro y\nleia(x)\nleia(y)\nse (x < y)\n{\n    escreva(x)\n}\nsenao\n{\n    escreva(y)\n}'
      },
      {
        tipo: 'code', titulo: 'Senha correta ou incorreta', enunciado: 'Leia uma senha (<code>cadeia</code>). Se for <code>"abc123"</code>, mostre <b>Senha correta</b>; senão, mostre <b>Senha incorreta</b>.',
        starter: W(''),
        rules: [R.cnt('senao', 1), R.out(['abc123'], nao(/correta/i, /incorreta/i), 'abc123 → Senha correta'), R.out(['xyz'], /incorreta/i, 'xyz → Senha incorreta')],
        sol: W('cadeia senha\nleia(senha)\nse (senha == "abc123")\n{\n    escreva("Senha correta")\n}\nsenao\n{\n    escreva("Senha incorreta")\n}'),
        h: ['Declare cadeia senha e leia com leia(senha).', 'Compare usando == e aspas duplas: se (senha == "abc123"), colocando a outra mensagem no senao.'],
        ex: 'cadeia chave\nleia(chave)\nse (chave == "sol")\n{\n    escreva("Certo")\n}\nsenao\n{\n    escreva("Errado")\n}'
      },
      {
        tipo: 'code', titulo: 'Par ou ímpar', enunciado: 'Leia um número <code>inteiro</code>. Se o resto da divisão por 2 (<code>n % 2 == 0</code>) for zero, mostre <b>Par</b>; senão, mostre <b>Ímpar</b>.',
        starter: W(''),
        rules: [R.op('%'), R.cnt('senao', 1), R.out(['4'], nao(/\bpar\b/i, /[ií]mpar/i), '4 → Par'), R.out(['7'], /[ií]mpar/i, '7 → Ímpar')],
        sol: W('inteiro n\nleia(n)\nse (n % 2 == 0)\n{\n    escreva("Par")\n}\nsenao\n{\n    escreva("Ímpar")\n}'),
        modelo: { inline: 'se (n % 2 == 0)' },
        h: ['Todo número par dividido por 2 deixa resto 0, ou seja: n % 2 == 0.', 'Se n % 2 == 0 for verdadeiro, escreva("Par"); no bloco senao, escreva("Ímpar").'],
        ex: 'inteiro x\nleia(x)\nse (x % 10 == 0)\n{\n    escreva("Termina em zero")\n}\nsenao\n{\n    escreva("Outro final")\n}'
      },
      {
        tipo: 'order', titulo: 'Monte o programa com SE / SENÃO', enunciado: 'Organize as linhas: o programa lê uma nota e mostra Aprovado ou Reprovado.',
        linhas: ['programa', '{', '    funcao inicio()', '    {', '        real nota', '        leia(nota)', '        se (nota >= 7)', '        {', '            escreva("Aprovado")', '        }', '        senao', '        {', '            escreva("Reprovado")', '        }', '    }', '}'],
        dica: 'O senao fica logo depois do bloco do se, e depois dos dois blocos vêm os fechamentos da função e do programa.',
        h: ['Dentro de funcao inicio() {, declare real nota e leia com leia(nota) antes do se.', 'Feche o bloco do se com } antes de abrir senao {, e deixe "Aprovado" no se e "Reprovado" no senao.']
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Senao fora do lugar', enunciado: 'Há um comando solto entre o fechamento do <code>se</code> e o <code>senao</code>. Remova o comando intruso para corrigir a estrutura.',
        starter: W('inteiro idade\nleia(idade)\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}\nescreva("Fim")\nsenao\n{\n    escreva("Menor de idade")\n}'),
        rules: [R.out(['20'], nao(/Maior de idade/, /Menor/), '20 → Maior de idade'), R.out(['10'], nao(/Menor de idade/, /Maior/), '10 → Menor de idade')],
        sol: SE_EX,
        h: ['O comando senao precisa vir imediatamente após a chave } que fecha o se.', 'Apague a linha escreva("Fim") que ficou no meio entre o } do se e o senao.'],
        ex: 'se (idade >= 18)\n{\n    escreva("Maior")\n}\nsenao\n{\n    escreva("Menor")\n}'
      }
    ]
  });

  /* ====================================================== 12 — Lógicos */
  mod({
    id: 'm12', titulo: 'Operadores lógicos', sub: 'Combinando condições: e, ou, nao', icone: '12', track: true,
    dicas: ['Cada lado do e / ou precisa ser uma condição completa: (idade >= 18) e (idade <= 65).', 'e: as DUAS precisam ser verdadeiras. ou: basta UMA.', 'nao inverte: verdadeiro vira falso e vice-versa.'],
    exemplo: W('se (idade >= 18 e idade <= 65)\n{\n    escreva("Adulto")\n}'),
    licao: `
<h3>Combinando condições</h3>
<table class="tbl"><thead><tr><th>Operador</th><th>Significado</th><th>Regra</th></tr></thead><tbody>
<tr><td><code>e</code></td><td>E</td><td>Verdadeiro só se <b>as duas</b> condições forem verdadeiras</td></tr>
<tr><td><code>ou</code></td><td>Ou</td><td>Verdadeiro se <b>pelo menos uma</b> for verdadeira</td></tr>
<tr><td><code>nao</code></td><td>Negação</td><td>Inverte: verdadeiro vira falso, falso vira verdadeiro</td></tr></tbody></table>
<table class="tbl small"><thead><tr><th>A</th><th>B</th><th>A e B</th><th>A ou B</th></tr></thead><tbody>
<tr><td>V</td><td>V</td><td class="v">V</td><td class="v">V</td></tr><tr><td>V</td><td>F</td><td class="f">F</td><td class="v">V</td></tr>
<tr><td>F</td><td>V</td><td class="f">F</td><td class="v">V</td></tr><tr><td>F</td><td>F</td><td class="f">F</td><td class="f">F</td></tr></tbody></table>
${C(W('inteiro idade\nleia(idade)\n\nse (idade >= 18 e idade <= 65)\n{\n    escreva("Pode doar sangue")\n}\nsenao\n{\n    escreva("Não pode")\n}'), 'Exemplo com e')}
${NOTE('Escreva as duas condições completas: <code>idade >= 18 e idade <= 65</code>. O erro mais comum é escrever <code>idade >= 18 e <= 65</code> (falta a variável).', 'warn')}`,
    ex: [
      VF('inteiro idade\nidade = 30', '<code>idade >= 18 e idade <= 65</code> é:', true, 'As duas partes são verdadeiras (30 ≥ 18 e 30 ≤ 65), então o "e" resulta em verdadeiro.', [
        'Com o operador "e", as duas comparações precisam dar verdadeiro ao mesmo tempo.',
        'Teste cada metade com 30: 30 >= 18 é verdadeiro? E 30 <= 65 também é verdadeiro?'
      ]),
      VF('inteiro idade\nidade = 70', '<code>idade >= 18 e idade <= 65</code> é:', false, 'A primeira é verdadeira, mas 70 ≤ 65 é falsa. Com "e", uma falsa torna tudo falso.', [
        'Teste as duas partes substituindo idade por 70: (70 >= 18) e (70 <= 65).',
        'A segunda parte (70 <= 65) é falsa — e no operador "e", basta uma parte falsa para tudo ficar falso.'
      ]),
      VF('inteiro nota\nnota = 2', '<code>nota < 5 ou nota > 9</code> é:', true, 'Para o "ou" basta uma verdadeira: 2 < 5 é verdadeira.', [
        'No operador "ou", basta que PELO MENOS UMA das duas comparações seja verdadeira.',
        'Substitua nota por 2: a primeira comparação (2 < 5) já é verdadeira!'
      ]),
      VF('inteiro x\nx = 8', '<code>nao (x > 10)</code> é:', true, 'x > 10 é falso e o "nao" inverte: falso vira verdadeiro.', [
        'Resolva primeiro o que está dentro dos parênteses: como x vale 8, (8 > 10) é falso.',
        'Agora aplique o operador "nao", que inverte o resultado anterior (falso vira verdadeiro).'
      ]),
      {
        tipo: 'code', titulo: 'Usando o operador E', enunciado: 'Leia a idade (<code>inteiro</code>). Se for <code>&gt;= 18</code> <b>e</b> <code>&lt;= 65</code>, mostre <b>Pode doar sangue</b>; senão mostre <b>Não pode</b>.',
        starter: W(''),
        rules: [R.op('e'), R.out(['30'], nao(/\bPode doar/i, /N[aã]o pode/i), '30 → Pode doar sangue'), R.out(['17'], /N[aã]o pode/i, '17 → Não pode'), R.out(['66'], /N[aã]o pode/i, '66 → Não pode')],
        sol: W('inteiro idade\nleia(idade)\nse (idade >= 18 e idade <= 65)\n{\n    escreva("Pode doar sangue")\n}\nsenao\n{\n    escreva("Não pode")\n}'),
        h: ['Repita o nome da variável dos dois lados do operador e: idade >= 18 e idade <= 65.', 'Coloque "Pode doar sangue" no bloco do se e "Não pode" no bloco do senao.'],
        ex: 'inteiro n\nleia(n)\nse (n >= 1 e n <= 10)\n{\n    escreva("Na faixa")\n}\nsenao\n{\n    escreva("Fora")\n}'
      },
      {
        tipo: 'code', titulo: 'Usando o operador OU', enunciado: 'Leia uma letra (<code>caractere</code>). Se for <code>\'a\'</code> <b>ou</b> <code>\'e\'</code> (com aspas simples), mostre <b>Vogal</b>; senão mostre <b>Outra</b>.',
        starter: W(''),
        rules: [R.decl('caractere'), R.op('ou'), R.out(['a'], /Vogal/i, 'a → Vogal'), R.out(['e'], /Vogal/i, 'e → Vogal'), R.out(['x'], /Outra/i, 'x → Outra')],
        sol: W("caractere letra\nleia(letra)\nse (letra == 'a' ou letra == 'e')\n{\n    escreva(\"Vogal\")\n}\nsenao\n{\n    escreva(\"Outra\")\n}"),
        modelo: { inline: "se (letra == 'a' ou letra == 'e')" },
        h: ['Para comparar valores do tipo caractere, use aspas SIMPLES: \'a\' e \'e\'.', 'Escreva as duas comparações completas separadas por ou: se (letra == \'a\' ou letra == \'e\').'],
        ex: "caractere resp\nleia(resp)\nse (resp == 's' ou resp == 'S')\n{\n    escreva(\"Sim\")\n}\nsenao\n{\n    escreva(\"Não\")\n}"
      },
      {
        tipo: 'code', titulo: 'Usando o operador NAO', enunciado: 'Leia a idade (<code>inteiro</code>). Use o operador <code>nao</code> na condição <code>se (nao (idade &gt;= 18))</code> para mostrar <b>Menor</b>.',
        starter: W(''),
        rules: [R.op('nao'), R.out(['10'], /Menor/i, '10 → Menor'), R.out(['20'], not(/Menor/i), '20 → nada')],
        sol: W('inteiro idade\nleia(idade)\nse (nao (idade >= 18))\n{\n    escreva("Menor")\n}'),
        modelo: { inline: 'se (nao (idade >= 18))' },
        h: ['O operador se escreve nao (sem til) e envolve a condição que queremos inverter entre parênteses.', 'Declare inteiro idade, leia(idade) e monte se (nao (idade >= 18)) { escreva("Menor") }.'],
        ex: 'inteiro nota\nleia(nota)\nse (nao (nota >= 7))\n{\n    escreva("Abaixo da média")\n}'
      }
    ]
  });

  /* ====================================================== 13 — Escolha */
  const ESC_EX = W('inteiro opcao\n\nescreva("1 - Cadastro")\nescreva("\\n2 - Consulta")\nescreva("\\n3 - Sair")\nescreva("\\nEscolha: ")\nleia(opcao)\n\nescolha (opcao)\n{\n    caso 1:\n        escreva("Você escolheu Cadastro")\n        pare\n\n    caso 2:\n        escreva("Você escolheu Consulta")\n        pare\n\n    caso 3:\n        escreva("Saindo...")\n        pare\n\n    caso contrario:\n        escreva("Opção inválida")\n}');
  mod({
    id: 'm13', titulo: 'Estrutura ESCOLHA / CASO', sub: 'Escolhendo entre várias opções', icone: '13', track: true,
    dicas: ['escolha (variavel) { caso valor: comandos pare ... }', 'Cada caso termina com dois-pontos : e depois vêm os comandos dele.', 'Termine cada caso com pare, e use "caso contrario:" para as outras opções.'],
    exemplo: W('escolha (opcao)\n{\n    caso 1:\n        escreva("Um")\n        pare\n    caso contrario:\n        escreva("Outro")\n}'),
    licao: `
<h3>Muitas opções, uma estrutura</h3>
<p>Quando há várias possibilidades (como num menu), usar vários <code>se</code> fica cansativo. O <code>escolha</code> olha o valor de <b>uma variável</b> e executa o <code>caso</code> correspondente.</p>
${C(ESC_EX, 'Menu com escolha')}
<ul><li><code>escolha (variavel)</code> — inicia a seleção; a variável vai entre parênteses.</li><li><code>{ }</code> — delimitam todos os casos.</li><li><code>caso valor:</code> — define uma possibilidade. <b>Não esqueça os dois-pontos.</b></li><li><code>pare</code> — encerra aquele caso. Sem ele, o programa continua no próximo caso!</li><li><code>caso contrario:</code> — executa quando nenhuma opção combinou.</li></ul>
<h3>Erros intencionais</h3>
${BAD('caso 1\n    escreva("Um")', 'Faltaram os dois-pontos depois do caso.')}
${BAD('caso 1:\n    escreva("Um")\ncaso 2:\n    escreva("Dois")', 'Sem pare, ao escolher 1 o programa mostra "Um" E "Dois": ele "cai" para o próximo caso.')}
${BAD('escolha (opcao)\n{\n    caso "1":\n        escreva("Um")\n}', 'Valor incompatível: opcao é inteiro, mas o caso usa texto "1".')}
${NOTE('Os valores dos casos têm o mesmo tipo da variável: <code>inteiro</code> → <code>caso 1:</code>; <code>caractere</code> → <code>caso \'a\':</code>.', 'info')}`,
    ex: [
      {
        tipo: 'code', titulo: 'Menu com três opções', enunciado: 'Leia uma opção <code>inteiro</code> (1, 2 ou 3) e use <code>escolha</code> para mostrar <b>Cadastro</b>, <b>Consulta</b> ou <b>Sair</b>.',
        starter: W(''),
        rules: [R.usa('escolha'), R.cnt('caso', 3), R.out(['1'], /Cadastro/i, '1 → Cadastro'), R.out(['2'], /Consulta/i, '2 → Consulta'), R.out(['3'], /Sair/i, '3 → Sair'), R.out(['2'], not(/Sair|Cadastro/i), '2 mostra só Consulta', 'Quando escolhe 2 aparecem outras mensagens: falta o pare?')],
        sol: W('inteiro opcao\nleia(opcao)\nescolha (opcao)\n{\n    caso 1:\n        escreva("Cadastro")\n        pare\n    caso 2:\n        escreva("Consulta")\n        pare\n    caso 3:\n        escreva("Sair")\n        pare\n}'),
        h: ['Declare inteiro opcao, leia(opcao) e abra escolha (opcao) { ... }.', 'Crie caso 1:, caso 2: e caso 3: (com dois-pontos!) e coloque pare ao final de cada caso.'],
        ex: 'inteiro op\nleia(op)\nescolha (op)\n{\n    caso 1:\n        escreva("Novo")\n        pare\n    caso 2:\n        escreva("Abrir")\n        pare\n}'
      },
      {
        tipo: 'code', titulo: 'Dia da semana', enunciado: 'Leia um número de 1 a 7 e mostre o dia correspondente (1 = <b>Domingo</b> ... 7 = <b>Sábado</b>). Para qualquer outro valor, use <code>caso contrario:</code> mostrando <b>Inválido</b>.',
        starter: W(''),
        rules: [R.usa('escolha'), R.cnt('caso', 7), R.out(['1'], /Domingo/i, '1 → Domingo'), R.out(['4'], /Quarta/i, '4 → Quarta'), R.out(['7'], /S[aá]bado/i, '7 → Sábado'), R.out(['9'], /Inv[aá]lido/i, '9 → Inválido')],
        sol: W('inteiro d\nleia(d)\nescolha (d)\n{\n    caso 1:\n        escreva("Domingo")\n        pare\n    caso 2:\n        escreva("Segunda")\n        pare\n    caso 3:\n        escreva("Terça")\n        pare\n    caso 4:\n        escreva("Quarta")\n        pare\n    caso 5:\n        escreva("Quinta")\n        pare\n    caso 6:\n        escreva("Sexta")\n        pare\n    caso 7:\n        escreva("Sábado")\n        pare\n    caso contrario:\n        escreva("Inválido")\n}'),
        h: ['Monte os 7 casos numerados (caso 1: até caso 7:), cada um com seu escreva() e pare.', 'No final, antes de fechar a chave do escolha, adicione caso contrario: (sem acento!) com escreva("Inválido").'],
        ex: 'inteiro turno\nleia(turno)\nescolha (turno)\n{\n    caso 1:\n        escreva("Manhã")\n        pare\n    caso 2:\n        escreva("Tarde")\n        pare\n    caso contrario:\n        escreva("Inválido")\n}'
      },
      {
        tipo: 'code', titulo: 'Calculadora simples com escolha', enunciado: 'Leia dois números (<code>real</code>) e um operador (<code>caractere</code>: <code>\'+\'</code>, <code>\'-\'</code>, <code>\'*\'</code> ou <code>\'/\'</code>). Use <code>escolha</code> no operador para calcular e mostrar o resultado.',
        starter: W(''),
        rules: [R.usa('escolha'), R.decl('caractere'), R.out(['10', '5', '+'], /\b15(\.0)?\b/, '10, 5 e + → 15'), R.out(['10', '5', '-'], /\b5(\.0)?\b/, '10, 5 e - → 5'), R.out(['6', '7', '*'], /\b42(\.0)?\b/, '6, 7 e * → 42'), R.out(['20', '4', '/'], /\b5(\.0)?\b/, '20, 4 e / → 5')],
        sol: W("real a\nreal b\ncaractere op\nleia(a)\nleia(b)\nleia(op)\nescolha (op)\n{\n    caso '+':\n        escreva(a + b)\n        pare\n    caso '-':\n        escreva(a - b)\n        pare\n    caso '*':\n        escreva(a * b)\n        pare\n    caso '/':\n        escreva(a / b)\n        pare\n}"),
        modelo: { inline: "caso '+':   escreva(a + b)   pare" },
        h: ['Leia na ordem pedida: primeiro os dois números (real a, real b) e por último o símbolo (caractere op).', 'Como op é caractere, cada caso usa aspas SIMPLES: caso \'+\':, caso \'-\':, caso \'*\': e caso \'/\':.'],
        ex: "real x\nreal y\ncaractere s\nleia(x)\nleia(y)\nleia(s)\nescolha (s)\n{\n    caso '+':\n        escreva(x + y)\n        pare\n}"
      },
      {
        tipo: 'code', titulo: 'Menu de atendimento', enunciado: 'Leia 1, 2 ou 3 e mostre <b>Suporte</b>, <b>Vendas</b> ou <b>Financeiro</b>. Para outro número, mostre <b>Opção inválida</b> usando <code>caso contrario:</code>.',
        starter: W(''),
        rules: [R.usa('escolha'), R.usa('contrario', 'Usa caso contrario:'), R.out(['1'], /Suporte/i, '1 → Suporte'), R.out(['2'], nao(/Vendas/i, /Suporte|Financeiro/i), '2 → Vendas'), R.out(['3'], /Financeiro/i, '3 → Financeiro'), R.out(['9'], /inv[aá]lida/i, '9 → Opção inválida')],
        sol: W('inteiro op\nleia(op)\nescolha (op)\n{\n    caso 1:\n        escreva("Suporte")\n        pare\n    caso 2:\n        escreva("Vendas")\n        pare\n    caso 3:\n        escreva("Financeiro")\n        pare\n    caso contrario:\n        escreva("Opção inválida")\n}'),
        h: ['Não esqueça de colocar o comando pare ao final de caso 1:, caso 2: e caso 3:.', 'Por último, escreva caso contrario: (sem acento em contrario e com dois-pontos) mostrando "Opção inválida".'],
        ex: 'inteiro setor\nleia(setor)\nescolha (setor)\n{\n    caso 1:\n        escreva("RH")\n        pare\n    caso contrario:\n        escreva("Opção inválida")\n}'
      },
      {
        tipo: 'order', titulo: 'Monte o escolha', enunciado: 'Coloque as linhas do programa na ordem correta.',
        linhas: ['programa', '{', '    funcao inicio()', '    {', '        inteiro opcao', '        leia(opcao)', '        escolha (opcao)', '        {', '            caso 1:', '                escreva("Um")', '                pare', '            caso contrario:', '                escreva("Outro")', '        }', '    }', '}'],
        dica: 'A variável precisa ser lida antes do escolha. Dentro das chaves do escolha, cada caso vem antes de seus comandos, e o "caso contrario" por último.',
        h: ['Declare inteiro opcao e faça leia(opcao) antes de abrir escolha (opcao) {.', 'Dentro do escolha: caso 1:, escreva("Um"), pare, depois caso contrario: e escreva("Outro"), fechando as três chaves } no fim.']
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Corrija o menu', enunciado: 'Este menu tem dois erros: falta <code>:</code> em <code>caso 1</code> e falta <code>pare</code> no <code>caso 2</code>. Corrija-os.',
        starter: W('inteiro opcao\nleia(opcao)\nescolha (opcao)\n{\n    caso 1\n        escreva("Cadastro")\n        pare\n    caso 2:\n        escreva("Consulta")\n    caso contrario:\n        escreva("Opção inválida")\n}'),
        rules: [R.out(['1'], nao(/Cadastro/, /inv/i), '1 → Cadastro'), R.out(['2'], nao(/Consulta/, /inv[aá]lida/i), '2 → só Consulta', 'Ao escolher 2, aparece também "Opção inválida": falta o comando pare.'), R.out(['7'], /inv[aá]lida/i, '7 → Opção inválida')],
        sol: W('inteiro opcao\nleia(opcao)\nescolha (opcao)\n{\n    caso 1:\n        escreva("Cadastro")\n        pare\n    caso 2:\n        escreva("Consulta")\n        pare\n    caso contrario:\n        escreva("Opção inválida")\n}'),
        h: ['1º erro: adicione dois-pontos logo depois de caso 1 para ficar caso 1:.', '2º erro: adicione pare logo abaixo de escreva("Consulta") para não cair em "Opção inválida".'],
        ex: 'caso 1:\n    escreva("Item 1")\n    pare\ncaso 2:\n    escreva("Item 2")\n    pare'
      },
      Q('Qual é a função do comando <code>pare</code> dentro de um caso?', ['Fecha o programa', 'Encerra aquele caso e sai do escolha', 'Pede um novo valor', 'Apaga a variável'], 1, 'O pare impede que o programa continue executando os comandos dos casos seguintes.', {
        h: ['Lembre o que acontecia no exercício anterior quando faltava o pare no caso 2.', 'O pare encerra apenas o caso atual e salta para fora do bloco escolha.']
      }),
      Q('A variável <code>opcao</code> é <b>inteiro</b>. Qual caso está correto?', ['caso "1":', 'caso 1:', 'caso 1', 'caso um:'], 1, 'Para variável inteiro usa-se número sem aspas, seguido de dois-pontos: caso 1:', {
        h: ['Observe duas regras: variável inteiro usa número SEM aspas, e todo caso termina com dois-pontos (:).', 'Elimine as opções que têm aspas ou que esqueceram os dois-pontos no final.']
      })
    ]
  });

  /* ====================================================== 14 — Monte o algoritmo */
  const E1 = [
    {
      titulo: 'Estrutura inicial', texto: 'Monte a <b>estrutura inicial</b>: <code>programa</code>, <code>funcao inicio()</code> e as chaves. Ainda sem comandos dentro.',
      rules: [R.ok('Estrutura programa → funcao inicio() montada e fechada')],
      h: ['Todo programa começa com programa { e dentro dele tem funcao inicio() { }.', 'Abra duas chaves { e feche as duas chaves } no final.'],
      ex: ESQ
    },
    {
      titulo: 'Declarar as variáveis', texto: 'Dentro de <code>funcao inicio()</code>, declare <b>três variáveis numéricas</b>: duas para os números e uma para o resultado.',
      rules: [R.declNum(3, 'Declara 3 variáveis numéricas')],
      h: ['Declare as três variáveis logo no início de funcao inicio(), antes de qualquer comando.', 'Escreva tipo e nome em cada linha (por exemplo: inteiro n1, inteiro n2 e inteiro soma).'],
      ex: 'inteiro a\ninteiro b\ninteiro total'
    },
    {
      titulo: 'Solicitar os números', texto: 'Abaixo das declarações, use dois comandos <code>escreva()</code> para <b>pedir</b> os dois números ao usuário (uma mensagem diferente para cada).',
      rules: [R.cnt('escreva', 2), R.strs(2, 'Usa duas mensagens diferentes')],
      h: ['Mantenha as variáveis no topo e acrescente dois comandos escreva("...") abaixo delas.', 'Use textos diferentes nos dois escreva, como "Primeiro número: " e "Segundo número: ".'],
      ex: 'escreva("Primeiro valor: ")\nescreva("Segundo valor: ")'
    },
    {
      titulo: 'Receber os números', texto: 'Logo após cada <code>escreva()</code> de pedido, adicione o comando <code>leia()</code> correspondente para guardar os dois números.',
      rules: [R.cnt('leia', 2), R.out(['3', '4'], () => true, 'O programa pausa e recebe os números')],
      h: ['Intercale os comandos: escreva da 1ª pergunta -> leia da 1ª variável -> escreva da 2ª pergunta -> leia da 2ª variável.', 'Lembre-se: dentro do leia() vai apenas o nome da variável, sem aspas.'],
      ex: 'escreva("Primeiro: ")\nleia(a)\nescreva("Segundo: ")\nleia(b)'
    },
    {
      titulo: 'Calcular a soma', texto: 'Depois de ler os dois números, calcule a soma com <code>+</code> e guarde na variável de resultado usando <code>=</code>.',
      rules: [R.atrib(1), R.op('+')],
      h: ['A variável que guarda o resultado fica à esquerda do = e a soma das duas variáveis lidas fica à direita.', 'Escreva essa linha abaixo do segundo leia().'],
      ex: 'total = a + b'
    },
    {
      titulo: 'Exibir o resultado', texto: 'Na última linha de <code>inicio()</code>, use <code>escreva()</code> para mostrar a variável com o resultado da soma.',
      rules: [R.out(['3', '4'], /\b7\b/, '3 e 4 → 7'), R.out(['10', '25'], /\b35\b/, '10 e 25 → 35')],
      h: ['Passe a variável do resultado para o escreva() (sozinha ou após um texto com vírgula).', 'Não coloque o nome da variável de resultado entre aspas para que apareça o valor calculado.'],
      ex: 'escreva("Soma: ", total)'
    }
  ];
  const E2 = [
    {
      titulo: 'Estrutura inicial', texto: 'Monte a <b>estrutura inicial</b> do programa (<code>programa</code>, <code>funcao inicio()</code> e chaves).',
      rules: [R.ok('Estrutura montada')],
      h: ['Comece com programa { e coloque funcao inicio() { } dentro dele.', 'Confira se há duas chaves { abertas e duas chaves } fechadas.'],
      ex: ESQ
    },
    {
      titulo: 'Declarar a variável', texto: 'Dentro de <code>funcao inicio()</code>, declare uma variável <code>inteiro</code> para guardar a idade.',
      rules: [R.decl('inteiro')],
      h: ['Coloque a declaração na primeira linha dentro das chaves de funcao inicio().', 'Escreva primeiro o tipo inteiro e depois o nome idade.'],
      ex: 'inteiro idade'
    },
    {
      titulo: 'Perguntar a idade', texto: 'Abaixo da variável, use <code>escreva()</code> para perguntar a idade ao usuário.',
      rules: [R.cnt('escreva', 1), R.strs(1)],
      h: ['Mantenha a declaração da variável e acrescente um escreva("...") na linha de baixo.', 'O texto da pergunta deve ficar entre aspas duplas.'],
      ex: 'escreva("Digite sua idade: ")'
    },
    {
      titulo: 'Ler a idade', texto: 'Logo abaixo da pergunta, use <code>leia()</code> para guardar o valor digitado na variável.',
      rules: [R.cnt('leia', 1)],
      h: ['Passe o mesmo nome da variável declarada para dentro do leia(), sem aspas.', 'O comando leia vem imediatamente após o escreva da pergunta.'],
      ex: 'leia(idade)'
    },
    {
      titulo: 'Montar a decisão', texto: 'Abaixo do <code>leia</code>, monte a estrutura <code>se (idade &gt;= 18) { } senao { }</code> (os blocos podem ficar vazios nesta etapa).',
      rules: [R.cnt('se', 1), R.cnt('senao', 1), R.op('>=')],
      h: ['Coloque a condição entre parênteses usando o operador >= 18.', 'Abra e feche { } para o se e, logo em seguida, escreva senao (sem til) com suas próprias chaves { }.'],
      ex: 'se (idade >= 18)\n{\n}\nsenao\n{\n}'
    },
    {
      titulo: 'Mostrar as mensagens', texto: 'Complete os blocos: mostre <b>Maior de idade</b> dentro do <code>se</code> e <b>Menor de idade</b> dentro do <code>senao</code>.',
      rules: [R.out(['20'], nao(/Maior de idade/i, /Menor/i), '20 → Maior de idade'), R.out(['12'], nao(/Menor de idade/i, /Maior/i), '12 → Menor de idade')],
      h: ['Coloque um comando escreva("Maior de idade") entre as chaves do se.', 'Coloque um comando escreva("Menor de idade") entre as chaves do senao.'],
      ex: 'se (idade >= 18)\n{\n    escreva("Maior de idade")\n}\nsenao\n{\n    escreva("Menor de idade")\n}'
    }
  ];
  mod({
    id: 'm14', titulo: 'Monte seu primeiro algoritmo', sub: 'Construa um programa completo, etapa por etapa', icone: '14', track: true,
    dicas: ['Releia o objetivo da etapa: ela só pede UMA coisa.', 'Pense em ONDE a nova linha entra: dentro das chaves de inicio(), na ordem certa.', 'A ordem é: declarar → avisar (escreva) → receber (leia) → calcular → mostrar (escreva).'],
    exemplo: W('inteiro numero\nescreva("Digite um número: ")\nleia(numero)'),
    licao: `
<h3>Hora de juntar tudo</h3>
<p>Aqui o programa <b>não é entregue pronto</b>: você o constrói por etapas. Cada etapa tem um objetivo; o botão <b>Verificar</b> só libera a próxima quando você cumprir a etapa atual.</p>
<p>Pense na ordem natural de qualquer algoritmo simples:</p>
<div class="flow"><span>1 Estrutura</span><i>→</i><span>2 Declarar</span><i>→</i><span>3 Avisar</span><i>→</i><span>4 Ler</span><i>→</i><span>5 Calcular/Decidir</span><i>→</i><span>6 Mostrar</span></div>
${NOTE('Você continua no <b>mesmo código</b> de uma etapa para outra: vá acrescentando linhas. Use Executar a qualquer momento para testar.', 'ok')}`,
    ex: [
      { tipo: 'code', fase: 'ESCREVER', titulo: 'Missão: somar dois números', enunciado: 'Construa passo a passo um programa completo que peça dois números e mostre a soma.', starter: '', etapas: E1, rules: [], sol: W('inteiro numero1\ninteiro numero2\ninteiro resultado\n\nescreva("Digite o primeiro número: ")\nleia(numero1)\nescreva("Digite o segundo número: ")\nleia(numero2)\n\nresultado = numero1 + numero2\nescreva("Soma: ", resultado)') },
      { tipo: 'code', fase: 'ESCREVER', titulo: 'Missão: maior ou menor de idade', enunciado: 'Construa passo a passo um programa que pergunte a idade e diga se a pessoa é maior ou menor de idade.', starter: '', etapas: E2, rules: [], sol: SE_EX }
    ]
  });

  /* ====================================================== 15 — Corrija */
  mod({
    id: 'm15', titulo: 'Correção de erros', sub: 'Encontre e corrija os problemas — sem correção automática', icone: '15', track: true,
    dicas: ['Clique em Verificar para ver a linha exata do erro e a dica.', 'Corrija um erro de cada vez e verifique de novo.', 'Compare a estrutura com o modelo do comando.'],
    exemplo: W('inteiro idade\nleia(idade)\nse (idade >= 18)\n{\n    escreva("Maior")\n}'),
    licao: `
<h3>Programadores passam muito tempo corrigindo erros</h3>
<p>Isso é normal! A habilidade de <b>ler o erro, entender e corrigir</b> é uma das mais importantes. Neste módulo o sistema <b>não corrige por você</b>:</p>
<ol><li>Clique em <b>Executar</b> para ver a lista de erros com a linha de cada um.</li><li>Leia a explicação e a dica do Professor.</li><li>Corrija no editor.</li><li>Execute novamente. Repita até funcionar.</li></ol>
${NOTE('Dica de ouro: ao corrigir, o programa também precisa continuar fazendo o que fazia. Não vale apagar tudo!', 'warn')}
<p>Há também a seção <b>"O que está errado?"</b> no menu, com mais de 30 perguntas rápidas sobre erros comuns.</p>`,
    ex: [
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Maior de idade (3 erros)', enunciado: 'Encontre e corrija os <b>três erros</b> deste programa para ler a idade e mostrar <b>Maior de idade</b> quando for <code>&gt;= 18</code>.',
        starter: 'programa\n{\n    funcao inicio()\n    {\n        inteiro idade\n\n        escreva("Digite sua idade: ")\n        leia("idade")\n\n        se idade >= 18\n        {\n            escreva("Maior de idade")\n        }\n    }\n',
        rules: [R.out(['20'], /Maior de idade/, '20 → Maior de idade'), R.out(['10'], not(/Maior/), '10 → nada'), R.usa('leia'), R.usa('se')],
        sol: W('inteiro idade\n\nescreva("Digite sua idade: ")\nleia(idade)\n\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}'),
        h: ['Verifique três lugares: o comando leia("idade"), a condição do se e o fechamento das chaves no final do arquivo.', 'Remova as aspas de leia(idade), coloque parênteses em se (idade >= 18) e feche a última chave } do programa.'],
        ex: W('inteiro anos\nleia(anos)\nse (anos >= 18)\n{\n    escreva("Maior")\n}')
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Soma sem declarar', enunciado: 'Este programa tenta usar <code>n1</code>, <code>n2</code> e <code>soma</code> sem tê-las declarado antes. Corrija.',
        starter: W('escreva("Digite o primeiro número: ")\nleia(n1)\nescreva("Digite o segundo número: ")\nleia(n2)\nsoma = n1 + n2\nescreva("Soma: ", soma)'),
        rules: [R.out(['3', '4'], /\b7\b/, '3 e 4 → 7'), R.out(['10', '5'], /\b15\b/, '10 e 5 → 15')],
        sol: W('inteiro n1\ninteiro n2\ninteiro soma\nescreva("Digite o primeiro número: ")\nleia(n1)\nescreva("Digite o segundo número: ")\nleia(n2)\nsoma = n1 + n2\nescreva("Soma: ", soma)'),
        h: ['Toda variável precisa ser criada (declarada) antes de aparecer em leia() ou em uma conta.', 'No topo de funcao inicio(), declare inteiro n1, inteiro n2 e inteiro soma.'],
        ex: 'inteiro a\ninteiro b\ninteiro res\nleia(a)\nleia(b)\nres = a + b'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Aprovado ou reprovado', enunciado: 'Corrija os três erros de parênteses e chaves para o programa avaliar a nota corretamente.',
        starter: W('inteiro nota\nescreva("Digite a nota: "\nleia(nota)\nse nota >= 7\n{\n    escreva("Aprovado")\n}\nsenao\n    escreva("Reprovado")'),
        rules: [R.out(['8'], nao(/Aprovado/, /Reprovado/), '8 → Aprovado'), R.out(['3'], /Reprovado/, '3 → Reprovado')],
        sol: W('inteiro nota\nescreva("Digite a nota: ")\nleia(nota)\nse (nota >= 7)\n{\n    escreva("Aprovado")\n}\nsenao\n{\n    escreva("Reprovado")\n}'),
        h: ['Olhe o final do primeiro escreva, a linha do se e o bloco do senao.', 'Feche ) em escreva("Digite a nota: "), coloque parênteses em se (nota >= 7) e envolva o comando do senao entre chaves { }.'],
        ex: 'se (nota >= 7)\n{\n    escreva("Aprovado")\n}\nsenao\n{\n    escreva("Reprovado")\n}'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Menu com valores errados', enunciado: 'A variável <code>opcao</code> é <code>inteiro</code>, mas os casos usam textos entre aspas. Corrija para 1 mostrar <b>Iniciar</b> e 2 mostrar <b>Sair</b>.',
        starter: W('inteiro opcao\nleia(opcao)\nescolha (opcao)\n{\n    caso "1":\n        escreva("Iniciar")\n        pare\n    caso "2":\n        escreva("Sair")\n        pare\n}'),
        rules: [R.out(['1'], /Iniciar/, '1 → Iniciar'), R.out(['2'], /Sair/, '2 → Sair')],
        sol: W('inteiro opcao\nleia(opcao)\nescolha (opcao)\n{\n    caso 1:\n        escreva("Iniciar")\n        pare\n    caso 2:\n        escreva("Sair")\n        pare\n}'),
        h: ['O valor de cada caso precisa ter exatamente o mesmo tipo da variável do escolha.', 'Como opcao é inteiro, remova as aspas de "1" e "2" nos casos (mantendo os dois-pontos: caso 1: e caso 2:).'],
        ex: 'escolha (opcao)\n{\n    caso 1:\n        escreva("Um")\n        pare\n}'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Atribuições erradas', enunciado: 'Corrija o sinal de atribuição de <code>idade</code> e o valor atribuído a <code>altura</code> para exibir <b>18 anos e 1.7 m</b>.',
        starter: W('inteiro idade\nidade == 18\nreal altura = "1.70"\nescreva(idade, " anos e ", altura, " m")'),
        rules: [R.out([], /18 anos e 1\.7 m/, 'Mostra "18 anos e 1.7 m"')],
        sol: W('inteiro idade\nidade = 18\nreal altura = 1.70\nescreva(idade, " anos e ", altura, " m")'),
        h: ['Na linha idade == 18, == apenas compara (não guarda). E na linha de altura, "1.70" com aspas é texto.', 'Troque == por = em idade = 18 e tire as aspas de 1.70 em real altura = 1.70.'],
        ex: 'inteiro qtd\nqtd = 3\nreal peso = 2.5'
      },
      {
        tipo: 'code', fase: 'CORRIGIR', fix: true, titulo: 'Texto e pontuação', enunciado: 'Corrija os três erros de pontuação (ponto e vírgula, aspas abertas e falta de vírgula) para mostrar <b>Olá, </b> seguido do nome.',
        starter: 'programa\n{\n    funcao inicio()\n    {\n        cadeia nome;\n        escreva("Qual é o seu nome? )\n        leia(nome)\n        escreva("Olá, " nome)\n    }\n}\n',
        rules: [R.out(['Ana'], /Olá, Ana/, 'Mostra "Olá, Ana"')],
        sol: W('cadeia nome\nescreva("Qual é o seu nome? ")\nleia(nome)\nescreva("Olá, ", nome)'),
        h: ['Em Portugol não usamos ponto e vírgula (;) no fim da declaração. Confira também os dois comandos escreva.', 'Apague o ; de cadeia nome, feche as aspas em "Qual é o seu nome? " e coloque vírgula entre "Olá, " e nome.'],
        ex: 'cadeia nome\nescreva("Seu nome: ")\nleia(nome)\nescreva("Olá, ", nome)'
      }
    ]
  });

  /* ====================================================== 16 — Desafios */
  mod({
    id: 'm16', titulo: 'Desafios finais', sub: 'Mostre o que você aprendeu', icone: '16', track: true,
    dicas: ['Planeje no papel: o que entra? O que o programa faz? O que sai?', 'Monte primeiro a estrutura e as variáveis, depois os comandos na ordem.', 'Teste com valores diferentes — o desafio é avaliado com vários testes.'],
    exemplo: W('inteiro numero\nescreva("Digite: ")\nleia(numero)\nescreva(numero)'),
    licao: `
<h3>Desafios práticos</h3>
<p>Cinco pequenos desafios avaliam <b>a lógica, os comandos usados e a estrutura</b> do seu algoritmo. Cada um é verificado com várias entradas. Não há dicas de solução pronta: pense, escreva, teste e corrija.</p>
${NOTE('Antes de escrever, responda: <b>quais dados entram? que decisões existem? o que deve sair?</b>', 'ok')}`,
    ex: [
      {
        tipo: 'code', fase: 'ESCREVER', desafio: true, titulo: 'Desafio 1 — Apresentação', enunciado: 'Escreva o programa completo do zero: leia o <b>nome</b> (<code>cadeia</code>) e a <b>idade</b> (<code>inteiro</code>) e mostre uma saudação com os dois valores, como <i>Olá, Ana! Você tem 20 anos.</i>',
        starter: '',
        rules: [R.decl('cadeia', 1, 'Declara variável para o nome (cadeia)'), R.decl('inteiro', 1, 'Declara variável para a idade (inteiro)'), R.cnt('leia', 2), R.out(['Ana', '20'], /Ana[\s\S]*20/, 'Lógica: mostra nome e idade'), R.out(['Bruno', '31'], /Bruno[\s\S]*31/, 'Lógica com outros valores')],
        sol: W('cadeia nome\ninteiro idade\nescreva("Nome: ")\nleia(nome)\nescreva("Idade: ")\nleia(idade)\nescreva("Olá, ", nome, "! Você tem ", idade, " anos.")'),
        h: ['Comece montando programa { funcao inicio() { ... } } e declare cadeia nome e inteiro idade no topo.', 'Leia o nome primeiro, depois a idade, e exiba os dois juntos no escreva() separando textos e variáveis por vírgula.'],
        ex: W('cadeia cidade\ninteiro ddd\nleia(cidade)\nleia(ddd)\nescreva(cidade, " - DDD ", ddd)')
      },
      {
        tipo: 'code', fase: 'ESCREVER', desafio: true, titulo: 'Desafio 2 — Quatro operações', enunciado: 'Escreva o programa completo: receba dois números e mostre os resultados da <b>soma</b> (<code>+</code>), <b>subtração</b> (<code>-</code>), <b>multiplicação</b> (<code>*</code>) e <b>divisão</b> (<code>/</code>).',
        starter: '',
        rules: [R.cnt('leia', 2), R.op('+'), R.op('-'), R.op('*'), R.op('/'), { label: 'Lógica: 10 e 5 → 15, 5, 50, 2', async test(c) { const r = await c.run(['10', '5']); if (r.erro) return { ok: false, msg: r.erro }; const t = r.out; return { ok: [/\b15(\.0)?\b/, /\b5(\.0)?\b/, /\b50(\.0)?\b/, /\b2(\.0)?\b/].every(x => x.test(t)), msg: `Com 10 e 5 o console mostrou "${t.trim()}" e faltou algum resultado (15, 5, 50 e 2).` }; } }, { label: 'Lógica com outros valores (8 e 2)', async test(c) { const r = await c.run(['8', '2']); if (r.erro) return { ok: false, msg: r.erro }; const t = r.out; return { ok: [/\b10(\.0)?\b/, /\b6(\.0)?\b/, /\b16(\.0)?\b/, /\b4(\.0)?\b/].every(x => x.test(t)), msg: `Com 8 e 2 o console mostrou "${t.trim()}" e faltou algum resultado (10, 6, 16 e 4).` }; } }],
        sol: W('real a\nreal b\nescreva("A: ")\nleia(a)\nescreva("B: ")\nleia(b)\nescreva("Soma: ", a + b)\nescreva("\\nSubtração: ", a - b)\nescreva("\\nMultiplicação: ", a * b)\nescreva("\\nDivisão: ", a / b)'),
        h: ['Monte a estrutura programa { funcao inicio() { ... } }, declare duas variáveis real (ex.: a e b) e leia ambas.', 'Mostre os quatro resultados separados por \\n ou espaço para que os números não fiquem colados uns nos outros!'],
        ex: W('real x\nreal y\nleia(x)\nleia(y)\nescreva(x + y, "\\n", x - y)')
      },
      {
        tipo: 'code', fase: 'ESCREVER', desafio: true, titulo: 'Desafio 3 — Média escolar', enunciado: 'Escreva o programa completo: receba <b>duas notas</b> (<code>real</code>), calcule e mostre a média, e informe <b>Aprovado</b> (média <code>&gt;= 7</code>) ou <b>Reprovado</b>.',
        starter: '',
        rules: [R.cnt('leia', 2), R.op('/'), R.cnt('se', 1), R.cnt('senao', 1), R.out(['8', '6'], nao(/\bAprovado/i, /Reprovado/i), 'Média 7 → Aprovado'), R.out(['4', '5'], /Reprovado/i, 'Média 4.5 → Reprovado'), R.out(['9', '10'], nao(/\bAprovado/i, /Reprovado/i), 'Média 9.5 → Aprovado')],
        sol: W('real n1\nreal n2\nreal media\nleia(n1)\nleia(n2)\nmedia = (n1 + n2) / 2\nescreva("Média: ", media, "\\n")\nse (media >= 7)\n{\n    escreva("Aprovado")\n}\nsenao\n{\n    escreva("Reprovado")\n}'),
        h: ['Declare real n1, real n2 e real media; leia n1 e n2 e calcule media = (n1 + n2) / 2 (com parênteses!).', 'Exiba a variável media e logo abaixo use se (media >= 7) { escreva("Aprovado") } senao { escreva("Reprovado") }.'],
        ex: W('real a\nreal b\nreal m\nleia(a)\nleia(b)\nm = (a + b) / 2\nse (m >= 6)\n{\n    escreva("Passou")\n}\nsenao\n{\n    escreva("Ficou")\n}')
      },
      {
        tipo: 'code', fase: 'ESCREVER', desafio: true, titulo: 'Desafio 4 — Maior número', enunciado: 'Escreva o programa completo: receba dois números diferentes e mostre apenas qual é o <b>maior</b>.',
        starter: '',
        rules: [R.cnt('leia', 2), R.cnt('se', 1), R.out(['3', '9'], nao(/\b9\b/, /\b3\b/), '3 e 9 → 9'), R.out(['12', '4'], nao(/\b12\b/, /\b4\b/), '12 e 4 → 12'), R.out(['-5', '-2'], nao(/-2\b/, /-5\b/), '-5 e -2 → -2')],
        sol: W('inteiro a\ninteiro b\nleia(a)\nleia(b)\nse (a > b)\n{\n    escreva("Maior: ", a)\n}\nsenao\n{\n    escreva("Maior: ", b)\n}'),
        h: ['Monte programa { funcao inicio() { ... } }, declare dois inteiros (a e b) e leia os dois.', 'Compare com se (a > b): no bloco do se mostre a, e no bloco do senao mostre b.'],
        ex: W('inteiro x\ninteiro y\nleia(x)\nleia(y)\nse (x < y)\n{\n    escreva(x)\n}\nsenao\n{\n    escreva(y)\n}')
      },
      {
        tipo: 'code', fase: 'ESCREVER', desafio: true, titulo: 'Desafio 5 — Menu interativo', enunciado: 'Escreva o programa completo: leia uma opção <code>inteiro</code> e use <code>escolha/caso</code> com <b>três opções</b> (1, 2 e 3, cada uma com mensagem diferente e <code>pare</code>) mais <code>caso contrario:</code>.',
        starter: '',
        rules: [R.usa('escolha'), R.cnt('caso', 3), R.usa('contrario', 'Usa caso contrario:'), R.usa('leia'), R.dist([['1'], ['2'], ['3'], ['9']], 'Lógica: opções 1, 2, 3 e inválida mostram mensagens diferentes')],
        sol: ESC_EX,
        h: ['Monte programa { funcao inicio() { ... } }, declare inteiro opcao e use leia(opcao) antes do escolha (opcao).', 'Crie caso 1:, caso 2: e caso 3: (todos terminando com pare) e finalize com caso contrario: mostrando outra mensagem.'],
        ex: W('inteiro op\nleia(op)\nescolha (op)\n{\n    caso 1:\n        escreva("Opção A")\n        pare\n    caso contrario:\n        escreva("Inválida")\n}')
      }
    ]
  });

  /* ====================================================== ONDE COLOCO ISSO */
  const SK_BASE = (ins) => ins;
  mod({
    id: 'onde', titulo: 'ONDE COLOCO ISSO?', sub: 'Cada comando tem o seu lugar', icone: 'T1', track: false, destaque: true,
    dicas: ['Lembre da estrutura: programa → funcao inicio() → (variáveis) → (comandos).', 'Tudo que o computador executa fica dentro das chaves de funcao inicio().', 'Declarar vem antes de usar; ler vem antes de usar o dado.'],
    exemplo: W('// DECLARAÇÃO DE VARIÁVEIS\n\n// COMANDOS DO ALGORITMO'),
    licao: `
<h3>Todo comando tem um lugar</h3>
<p>Um erro muito comum de iniciantes é escrever o comando certo no lugar errado. Veja o mapa colorido da estrutura. <b>Toque em cada parte</b> para ver o que ela faz:</p>
<div class="widget" data-widget="anatomia"></div>
<pre class="schema">programa
{
    funcao inicio()
    {
        // DECLARAÇÃO DE VARIÁVEIS

        // COMANDOS DO ALGORITMO

    }
}</pre>
<table class="tbl"><tbody>
<tr><td><b class="c1">programa</b></td><td>identifica o início do programa.</td></tr>
<tr><td><b class="c2">{ } após programa</b></td><td>delimitam o corpo do programa.</td></tr>
<tr><td><b class="c3">funcao inicio()</b></td><td>indica onde começa a execução principal.</td></tr>
<tr><td><b class="c4">{ } após inicio()</b></td><td>delimitam os comandos que serão executados.</td></tr>
<tr><td><b class="c5">Declaração de variáveis</b></td><td>normalmente aparece no início da função, antes dos comandos.</td></tr>
<tr><td><b class="c6">Comandos</b></td><td>instruções que serão executadas pelo computador.</td></tr></tbody></table>
<p>Nos exercícios abaixo, <b>clique no local correto</b> e depois leia o porquê.</p>`,
    ex: [
      PLACE('Onde devemos <b>declarar</b> uma variável chamada <code>idade</code>?', ['programa', '{', '    funcao inicio()', '    {', '@@decl|8|// DECLARAÇÃO DE VARIÁVEIS', '@@cmd|8|// COMANDOS DO ALGORITMO', '    }', '}'], 'decl', {
        decl: 'Correto! Variáveis são declaradas no início da função, antes dos comandos que vão usá-las.',
        cmd: 'Aqui seria na área dos comandos. Em geral funciona se for antes do uso, mas por organização declaramos tudo no começo, na área de declarações.'
      }, { h: ['Criamos as variáveis antes de executar qualquer comando que dependa delas.', 'Clique na primeira área logo no topo de funcao inicio().'] }),
      PLACE('Onde devemos colocar <code>escreva("Digite sua idade:")</code>?', ['@@antes|0|Antes de programa', 'programa', '{', '    funcao inicio()', '    {', '@@dentro|8|Dentro de funcao inicio()', '    }', '}', '@@depois|0|Depois da última chave'], 'dentro', {
        dentro: 'Correto! Todo comando que o computador deve executar fica dentro das chaves de <code>funcao inicio()</code>.',
        antes: 'Antes de <code>programa</code> não há nada em execução. O programa ainda nem começou.',
        depois: 'Depois da última chave o programa já terminou. Nada escrito ali é executado.'
      }, { h: ['Comandos como escreva() e leia() nunca podem ficar fora da função principal.', 'Clique no espaço que fica dentro das chaves de funcao inicio().'] }),
      PLACE('Onde começa o <b>programa</b>? Clique no local.', ['##a|programa', '##b|{', '##c|    funcao inicio()', '##d|    {', '##e|        escreva("Olá")', '##f|    }', '##g|}'], 'a', { a: 'Isso! A palavra programa marca o início.', _: 'Não é esta parte. O programa começa na palavra <code>programa</code>, primeira linha.' }, {
        fase: 'IDENTIFICAR',
        h: ['Procure a primeira linha que abre todo arquivo em Portugol.', 'Clique na palavra programa no topo.']
      }),
      PLACE('Onde começa a <b>execução principal</b>?', ['##a|programa', '##b|{', '##c|    funcao inicio()', '##d|    {', '##e|        escreva("Olá")', '##f|    }', '##g|}'], 'c', { c: 'Isso! O computador começa a executar a partir de funcao inicio().', _: 'Não é esta parte. A execução principal começa em <code>funcao inicio()</code>.' }, {
        fase: 'IDENTIFICAR',
        h: ['Qual linha define a função por onde o computador começa a rodar os comandos?', 'Clique na linha funcao inicio().']
      }),
      PLACE('Onde colocar <code>leia(idade)</code>? A idade será usada na última linha.', ['    {', '        inteiro idade', '@@a|8|aqui?', '        escreva("Digite sua idade: ")', '@@b|8|aqui?', '        escreva("Você tem ", idade, " anos")', '@@c|8|aqui?', '    }'], 'b', {
        b: 'Correto! Primeiro avisamos o usuário (escreva), depois lemos (leia) e só então usamos o valor.',
        a: 'O usuário seria obrigado a digitar sem ver a pergunta. O ideal é avisar primeiro, ler depois.',
        c: 'Tarde demais: a idade já foi usada na linha de cima, antes de ser lida (ela ainda valeria 0).'
      }, { h: ['Pense na ordem natural: 1) perguntar ao usuário, 2) ler a resposta, 3) mostrar o resultado.', 'O leia(idade) deve entrar depois da pergunta "Digite sua idade: " e antes de "Você tem...".'] }),
      PLACE('Qual chave <b>fecha a função inicio()</b>? Clique nela.', ['programa', '##p1|{', '    funcao inicio()', '##f1|    {', '        escreva("Olá")', '##f2|    }', '##p2|}'], 'f2', { f2: 'Isso! A chave indentada, logo após os comandos, fecha a função. A última fecha o programa.', p2: 'Essa é a última chave: ela fecha o programa, depois que a função já foi fechada.', _: 'Essa é uma chave de abertura. Procure a chave de fechamento que vem logo depois dos comandos.' }, {
        fase: 'IDENTIFICAR',
        h: ['As chaves fecham de dentro para fora: a que está alinhada com funcao inicio() fecha a função.', 'Procure a chave } recuada para a direita, logo abaixo de escreva("Olá").']
      }),
      PLACE('Onde colocar a atribuição <code>idade = 18</code>?', ['    {', '@@a|8|aqui?', '        inteiro idade', '@@b|8|aqui?', '        escreva(idade)', '    }'], 'b', { b: 'Correto! A variável precisa existir (declarada) antes de receber um valor.', a: 'Antes da declaração a variável ainda não existe: o computador não sabe onde guardar o 18.' }, {
        h: ['Só podemos guardar 18 na variável depois que ela foi declarada, e antes de mostrá-la no escreva.', 'Clique no espaço entre inteiro idade e escreva(idade).']
      }),
      PLACE('Onde colocar o <code>se</code> que verifica a idade lida?', ['        inteiro idade', '@@a|8|aqui?', '        escreva("Digite a idade: ")', '        leia(idade)', '@@b|8|aqui?', '    }'], 'b', { b: 'Correto! A condição só faz sentido depois que a idade foi lida.', a: 'Antes do leia, a idade ainda não foi digitada: a condição usaria o valor 0.' }, {
        h: ['Para testar se a idade é maior ou menor, o usuário já precisa tê-la digitado!', 'Coloque o se logo depois de leia(idade).']
      }),
      PLACE('Onde fica o <code>senao</code>?', ['        se (idade >= 18)', '        {', '@@a|12|dentro do bloco do se', '        }', '@@b|8|logo depois do bloco do se', '@@c|8|depois de outros comandos', '    }'], 'b', { b: 'Correto! O senao vem logo depois do } do se, como uma continuação dele.', a: 'Dentro do bloco do se o senao não faz sentido: a estrutura se/senao ainda não foi concluída.', c: 'Se houver outro comando entre o se e o senao, o senao fica solto (erro).' }, {
        h: ['O senao é a continuação direta do se, quando o bloco do se termina.', 'Clique na posição imediatamente após a chave } que fecha o se.']
      }),
      PLACE('Onde ficam os <code>caso</code> do escolha?', ['@@a|8|antes do escolha', '        escolha (opcao)', '        {', '@@b|12|dentro das chaves do escolha', '        }', '@@c|8|depois das chaves do escolha'], 'b', { b: 'Correto! Os casos ficam dentro das chaves do escolha.', a: 'Antes do escolha, o caso ficaria solto (erro: caso fora do escolha).', c: 'Depois do fechamento, o caso também ficaria solto, fora da estrutura.' }, {
        h: ['Cada caso pertence à estrutura escolha (opcao).', 'Clique no espaço entre a abertura { e o fechamento } do escolha.']
      })
    ]
  });

  /* ====================================================== O que está errado? */
  const QZ = [];
  const q = (code, opcoes, resp, expl, pergunta, h) => QZ.push(Q(pergunta || 'Qual é o problema deste trecho?', opcoes, resp, expl, { code, tag: 'Identificar erros', h }));
  q('inteiro idade\nidade = "18"', ['A variável não foi declarada.', 'O tipo da variável não corresponde ao valor atribuído.', 'O comando escreva está faltando.', 'Não existe erro.'], 1, 'A variável é inteiro, mas "18" entre aspas é texto. Para número, escreva 18 sem aspas.', null, ['Compare o tipo declarado na linha 1 (inteiro) com o valor na linha 2 ("18").', 'Qualquer coisa entre aspas duplas é considerada texto (cadeia), e não número inteiro.']);
  q('escreva("Olá"', ['Faltou fechar o parêntese.', 'Faltaram as aspas.', 'escreva não existe.', 'Não existe erro.'], 0, 'Todo parêntese aberto precisa de um fechamento: escreva("Olá").', null, ['Conte os símbolos de abertura e fechamento: parênteses ( ) e aspas " ".', 'As duas aspas estão lá, mas o parêntese ( aberto após escreva nunca foi fechado.']);
  q('cadeia nome\nleia("nome")', ['A variável deveria ser inteiro.', 'O nome da variável não pode ficar entre aspas no leia.', 'Falta o escreva.', 'O leia não existe.'], 1, 'O leia recebe o nome da variável, sem aspas: leia(nome).', null, ['Olhe o que foi colocado dentro dos parênteses do comando leia(...).', 'Em leia(), passamos a variável sem aspas para ela receber o dado digitado.']);
  q('idade inteiro', ['A ordem está invertida: tipo vem antes do nome.', 'Falta o sinal de igual.', 'inteiro não é um tipo.', 'Não existe erro.'], 0, 'Declaração: primeiro o tipo, depois o nome → inteiro idade.', null, ['Lembre a regra de declaração de variáveis em Portugol.', 'O tipo de dado (inteiro, real, cadeia) precisa vir sempre ANTES do nome da variável.']);
  q('inteiro idade\nidade == 18', ['Falta declarar idade.', 'O == compara; para guardar o valor deve-se usar =.', 'O valor 18 deveria ter aspas.', 'Não existe erro.'], 1, '= atribui (guarda). == compara. Para guardar 18 em idade: idade = 18.', null, ['Repare na quantidade de sinais de igual na segunda linha.', 'Dois sinais (==) fazem uma pergunta; para guardar 18 na variável usamos um único =.']);
  q('programa\n{\n    funcao inicio\n    {\n        escreva("Oi")\n    }\n}', ['Falta a palavra programa.', 'A função inicio precisa dos parênteses: inicio().', 'O escreva está errado.', 'Faltam chaves.'], 1, 'Os parênteses fazem parte do nome da função: funcao inicio().', null, ['Confira linha por linha o esqueleto básico do programa, especialmente a linha 3.', 'Toda função em Portugol precisa de abrir e fechar parênteses logo após o nome: inicio().']);
  q('inteiro idade\nleia(idade)\nse idade >= 18\n{\n    escreva("Maior")\n}', ['Faltam os parênteses da condição do se.', 'A variável não foi declarada.', 'O leia está errado.', 'Não existe erro.'], 0, 'A condição do se fica entre parênteses: se (idade >= 18).', null, ['Olhe a linha 3 onde começa a estrutura de decisão se.', 'A condição testada pelo comando se deve ficar obrigatoriamente entre parênteses ( ).']);
  q('escreva Olá', ['Faltaram parênteses e aspas.', 'O comando deveria ser leia.', 'A palavra Olá está errada.', 'Não existe erro.'], 0, 'O correto é escreva("Olá"): parênteses e aspas são obrigatórios.', null, ['Compare escreva Olá com a forma padrão de exibir um texto em Portugol.', 'O comando escreva exige parênteses ( ) e textos exigem aspas duplas " ".']);
  q('cadeia nome\nescreva(Nome)', ['O escreva não aceita variáveis.', 'A variável Nome (com N maiúsculo) não foi declarada: maiúsculas e minúsculas importam.', 'Falta o leia.', 'Não existe erro.'], 1, 'No Portugol, nome e Nome são palavras diferentes. A variável declarada é nome.', null, ['Compare letra por letra o nome declarado na linha 1 com o nome usado na linha 2.', 'Em programação, letras minúsculas e maiúsculas diferenciam nomes (nome é diferente de Nome).']);
  q('real nota = 8,5', ['O valor decimal usa ponto: 8.5.', 'real não é um tipo.', 'Falta o escreva.', 'Não existe erro.'], 0, 'Em Portugol, números decimais usam ponto, não vírgula.', null, ['Observe o separador usado entre o 8 e o 5 no número decimal.', 'Linguagens de programação usam ponto decimal (8.5) em vez de vírgula.']);
  q('inteiro a = 5\ninteiro a = 6', ['A variável a foi declarada duas vezes.', 'O valor 6 é inválido.', 'Falta o escreva.', 'Não existe erro.'], 0, 'Cada variável é declarada uma vez. Para mudar o valor depois: a = 6.', null, ['Repare que a palavra inteiro aparece nas duas linhas para o mesmo nome "a".', 'Declaramos a variável apenas uma vez; para trocar o valor depois usamos só a = 6.']);
  q('escolha (opcao)\n{\n    caso 1\n        escreva("A")\n        pare\n}', ['Faltam os dois-pontos depois de caso 1.', 'O pare está errado.', 'O escolha deve ter parênteses.', 'Não existe erro.'], 0, 'Cada caso termina com dois-pontos: caso 1:', null, ['Olhe atentamente o final da linha "caso 1".', 'Na estrutura escolha, todo caso precisa terminar com o sinal de dois-pontos (:).']);
  q('inteiro opcao\nopcao = 1\nescolha (opcao)\n{\n    caso 1:\n        escreva("A")\n    caso 2:\n        escreva("B")\n}', ['Aparecem A e B, pois falta o pare no caso 1.', 'Aparece só A.', 'Aparece só B.', 'Dá erro de sintaxe.'], 0, 'Sem pare, o programa continua executando o caso seguinte.', 'O que o programa mostra?', ['Veja o que está faltando entre o escreva("A") e o início do caso 2:.', 'Quando não há o comando pare encerrando um caso, o programa "escorrega" e executa o caso de baixo também.']);
  q('escreva("Fim")\nsenao\n{\n    escreva("x")\n}', ['O senao está sem um se antes dele.', 'Falta fechar o parêntese.', 'escreva está errado.', 'Não existe erro.'], 0, 'O senao só existe junto com um se.', null, ['Olhe o que vem antes da palavra senao neste trecho.', 'O comando senao nunca existe sozinho: ele depende de um bloco se (...) { ... } imediatamente antes.']);
  q('inteiro idade\nse (idade = 18)\n{\n    escreva("Tem 18")\n}', ['Na condição deve-se comparar com ==, não atribuir com =.', 'Falta declarar idade.', 'Faltam as chaves.', 'Não existe erro.'], 0, 'Dentro da condição use == para perguntar "é igual?".', null, ['Observe o operador colocado dentro dos parênteses de se (idade = 18).', 'Um único = guarda valor; para testar igualdade dentro de se (...) devemos usar ==.']);
  q('inteiro x\nx = 3.5', ['x deveria ser real, pois recebe um número decimal.', 'Falta o escreva.', 'x não foi declarada.', 'Não existe erro.'], 0, 'Um inteiro não guarda decimais. Use real x.', null, ['Compare o tipo escolhido na linha 1 com o número 3.5 na linha 2.', 'Números com casas decimais exigem o tipo real, pois inteiro não aceita parte fracionária.']);
  q('logico ok = "verdadeiro"', ['As aspas fazem virar texto; deve ser verdadeiro sem aspas.', 'logico não existe.', 'Falta declarar ok.', 'Não existe erro.'], 0, 'Valores lógicos são verdadeiro e falso, sem aspas.', null, ['Repare nas aspas colocadas em volta da palavra "verdadeiro".', 'Com aspas vira texto (cadeia); o tipo logico recebe a palavra verdadeiro sem aspas.']);
  q('escreva("Olá)', ['Faltou fechar as aspas duplas depois de Olá.', 'Falta a palavra programa.', 'O comando escreva não usa parênteses.', 'Não existe erro.'], 0, 'Todo texto aberto com aspas duplas precisa ser fechado antes do parêntese: escreva("Olá").', null, ['Olhe os sinais logo antes e logo depois da palavra Olá.', 'As aspas duplas foram abertas antes de Olá, mas faltou fechá-las antes do parêntese ).']);
  q('inteiro n\nn = 5\nescreva(n + )', ['Falta um valor depois do +.', 'n não foi declarada.', 'escreva não aceita variáveis.', 'Não existe erro.'], 0, 'O operador + precisa de um valor dos dois lados.', null, ['Olhe a conta dentro do escreva(n + ) na última linha.', 'Toda soma precisa de dois valores (um antes e outro depois do sinal +).']);
  q('programa\n{\n    funcao inicio()\n    {\n        escreva("Oi")\n    }', ['Falta fechar uma chave (a do programa).', 'Falta a palavra funcao.', 'O escreva está errado.', 'Não existe erro.'], 0, 'Há duas chaves abertas, mas só uma foi fechada. Cada { precisa de um }.', null, ['Conte quantas chaves { abrem e quantas chaves } fecham no código inteiro.', 'Foram abertas 2 chaves ({ de programa e { de inicio), mas apenas 1 chave } foi fechada no final.']);
  q('inteiro soma = 5\nescreva("Soma: " soma)', ['Falta uma vírgula entre o texto e a variável.', 'Falta fechar aspas.', 'soma não foi declarada.', 'Não existe erro.'], 0, 'Itens dentro do escreva são separados por vírgula: escreva("Soma: ", soma).', null, ['Observe como o texto "Soma: " e a variável soma foram colocados lado a lado no escreva.', 'Para exibir mais de um item no mesmo escreva(), é obrigatório separá-los com vírgula.']);
  q("cadeia nome = 'Maria'", ['Aspas simples são para um só caractere; textos usam aspas duplas.', 'cadeia não é tipo.', 'Falta o escreva.', 'Não existe erro.'], 0, "Para textos use aspas duplas: \"Maria\". Aspas simples servem para um caractere, como 'M'.", null, ['Veja que tipo de aspas foi usado ao redor da palavra Maria.', 'Aspas simples (\' \') servem apenas para 1 letra (caractere); textos (cadeia) exigem aspas duplas (" ").']);
  q('escreva(Olá)', ['Texto sem aspas: o computador procura uma variável chamada Olá.', 'Faltam parênteses.', 'escreva está errado.', 'Não existe erro.'], 0, 'Textos precisam estar entre aspas: escreva("Olá").', null, ['Olhe a palavra Olá dentro de escreva(Olá) — há alguma variável declarada com esse nome?', 'Sem aspas, o computador acha que Olá é variável; para mostrar como texto faltam as aspas duplas.']);
  q('inteiro 1idade', ['Nomes de variável não podem começar com número.', 'Falta o sinal de igual.', 'inteiro está errado.', 'Não existe erro.'], 0, 'Nomes de variáveis começam com letra (ou _).', null, ['Observe o primeiro símbolo do nome escolhido para a variável (1idade).', 'Em Portugol, identificadores podem ter números no final (idade1), mas nunca podem começar com número.']);
  q('caractere letra = "A"', ['Caractere usa aspas simples: \'A\'.', 'Falta declarar letra.', 'Não existe erro.', 'caractere não é um tipo.'], 0, "Um caractere fica entre aspas simples: 'A'. Aspas duplas formam texto (cadeia).", null, ['Compare o tipo caractere com as aspas duplas usadas em "A".', 'Mesmo tendo uma só letra, aspas duplas criam cadeia; o tipo caractere exige aspas simples \'A\'.']);
  q('inteiro idade\nidade = 20\nse (idade >= 18)\n    escreva("Maior")', ['Faltam as chaves do bloco do se.', 'A condição está errada.', 'idade deveria ser cadeia.', 'Não existe erro.'], 0, 'Os comandos do se ficam entre chaves { }.', null, ['Olhe o que vem abaixo de se (idade >= 18).', 'No nosso Portugol, o bloco de comandos do se precisa estar delimitado por chaves { e }.']);
  q('real media = (n1 + n2) / 2', ['n1 e n2 não foram declaradas.', 'real não aceita divisão.', 'Faltam aspas.', 'Não existe erro.'], 0, 'Antes de usar n1 e n2 numa conta, elas precisam ser declaradas.', null, ['Pergunte-se: de onde vieram as variáveis n1 e n2 usadas nessa fórmula?', 'Nenhuma variável pode ser usada em um cálculo sem ter sido declarada antes.']);
  q('inteiro idade\nidade = 17\nescreva(idade)', ['A variável não foi declarada.', 'O tipo não corresponde ao valor.', 'Falta o leia.', 'Não existe erro.'], 3, 'Este trecho está correto: declara, atribui e mostra a idade.', null, ['Verifique: tipo e nome estão na ordem certa? O valor 17 combina com inteiro? O escreva tem parênteses?', 'Nem todo trecho tem defeito — confira se todas as três linhas seguem perfeitamente as regras!']);
  q('cadeia nome = "Ana"\nescreva("Olá, ", nome)', ['Falta vírgula.', 'Aspas erradas.', 'Falta o parêntese.', 'Não existe erro.'], 3, 'Está tudo certo: variável declarada com valor e escreva com vírgula entre os itens.', null, ['Confira as aspas duplas em "Ana", a vírgula após "Olá, " e os parênteses do escreva.', 'Se declaração, tipos, vírgula e parênteses estão todos certos, lembre que existe a opção sem erro!']);
  q('inteiro idade\nleia(idade)', ['Falta a palavra programa e a função inicio.', 'idade deveria ser cadeia.', 'O leia está errado.', 'Não existe erro neste trecho.'], 3, 'Como é só um trecho, está correto: a variável foi declarada antes do leia.', null, ['Analise apenas o trecho de duas linhas: inteiro idade seguido de leia(idade).', 'A variável foi declarada antes e passada sem aspas para o leia() — o trecho em si está perfeito.']);
  q('funcao inicio()\n{\n    escreva("Oi")\n}', ['Falta a estrutura programa { } em volta da função.', 'O escreva está errado.', 'inicio não pode ter parênteses.', 'Não existe erro.'], 0, 'Todo programa começa com a palavra programa e suas chaves, que envolvem a função.', null, ['Pense no esqueleto completo de um algoritmo: o que vem por fora de funcao inicio()?', 'Toda funcao inicio() precisa estar envolvida pelo bloco principal programa { ... }.']);
  q('inteiro nota\nse (nota >= 7\n{\n    escreva("Aprovado")\n}', ['O parêntese da condição não foi fechado.', 'Falta o senao.', 'nota deveria ser real.', 'Não existe erro.'], 0, 'Feche a condição com ): se (nota >= 7).', null, ['Olhe o final da segunda linha: se (nota >= 7.', 'O parêntese da condição foi aberto após o se, mas faltou fechá-lo com ) depois do 7.']);
  q('inteiro x\nx = 3\npare', ['O pare só pode ser usado dentro de um escolha.', 'Falta o escreva.', 'x não foi declarada.', 'Não existe erro.'], 0, 'O pare serve para encerrar um caso do escolha.', null, ['Observe o comando pare solto na terceira linha — em qual estrutura ele costuma aparecer?', 'O comando pare só é válido dentro de um bloco escolha / caso.']);
  q('inteiro idade\nescreva("Idade: ", idade)\nidade = 20', ['Mostra 0, pois a idade foi usada antes de receber o valor.', 'Mostra 20.', 'Dá erro de sintaxe.', 'Não mostra nada.'], 0, 'O computador lê de cima para baixo: no momento do escreva, idade ainda valia 0. A ordem dos comandos importa!', 'O que o programa mostra?', ['Siga a execução de cima para baixo: qual linha roda primeiro, o escreva ou idade = 20?', 'Na hora em que o escreva roda (linha 2), a linha idade = 20 ainda não aconteceu, então idade vale o padrão inicial (0).']);
  q('inteiro idade\nidade = 20\nse (idade >= 18 e <= 65)\n{\n    escreva("Adulto")\n}', ['Depois do "e" falta repetir a variável: idade <= 65.', 'O operador e não existe.', 'Faltam aspas.', 'Não existe erro.'], 0, 'Cada lado do "e" é uma condição completa: idade >= 18 e idade <= 65.', null, ['Olhe o que vem imediatamente depois da palavra "e" na linha do se.', 'Em Portugol não podemos escrever "e <= 65" sem sujeito: é obrigatório repetir a variável (idade <= 65).']);
  mod({
    id: 'qz', titulo: 'O que está errado?', sub: `${QZ.length} perguntas rápidas sobre erros comuns`, icone: 'T2', track: false, destaque: true,
    dicas: ['Leia o trecho linha por linha, de cima para baixo.', 'Verifique: tipo antes do nome? parênteses fechados? chaves e aspas?', 'Lembre-se: pode não haver erro nenhum.'],
    exemplo: W('inteiro idade\nidade = 17'),
    licao: `<h3>Treino de olhar clínico</h3><p>Aqui você lê pequenos trechos e descobre o erro — habilidade que vai usar a vida toda. Após responder, a explicação aparece. <b>Atenção:</b> alguns trechos estão corretos!</p>${NOTE('Dica: primeiro verifique se todas as variáveis foram declaradas, depois a ordem do tipo e do nome, depois parênteses, aspas e chaves.', 'ok')}`,
    ex: QZ
  });

  /* ids, numeração global e metadados */
  let seq = 1;
  M.forEach(m => m.ex.forEach((e, i) => {
    e.id = `${m.id}-${i + 1}`;
    e.mod = m.id;
    e.num = seq++;
    if (!e.titulo) e.titulo = e.pergunta ? e.pergunta.replace(/<[^>]+>/g, '').slice(0, 60) : `Questão ${i + 1}`;
    if (!e.fase) e.fase = { code: 'ESCREVER', quiz: 'IDENTIFICAR', place: 'POSICIONAR', order: 'POSICIONAR', match: 'IDENTIFICAR' }[e.tipo];
  }));

  G.Content = { M, W, R, norm, track: M.filter(m => m.track) };
})(typeof globalThis !== 'undefined' ? globalThis : window);
