/* ==========================================================================
   Portugol Fácil — Interface Clean, Objetiva e com Progressão Sequencial
   O aluno só avança ao digitar o comando com a sintaxe correta.
   ========================================================================== */
(function () {
  'use strict';
  const { M, track, W } = Content;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
  const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36); };

  /* Ícones vetoriais limpos e discretos (sem emojis ou símbolos genéricos) */
  const svg = (d, sz = 15) => `<svg class="ic" width="${sz}" height="${sz}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    check: svg('<path d="M4 10.5l4 4 8-8.5"/>'),
    lock: svg('<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>', 14),
    play: svg('<polygon points="6,4.5 15.5,10 6,15.5" fill="currentColor" stroke="none"/>', 14),
    stop: svg('<rect x="5.5" y="5.5" width="9" height="9" rx="1" fill="currentColor" stroke="none"/>', 14),
    arrowR: svg('<path d="M4.5 10h11M11 5.5L15.5 10 11 14.5"/>'),
    arrowL: svg('<path d="M15.5 10h-11M9 5.5L4.5 10 9 14.5"/>'),
    up: svg('<path d="M5.5 12.5L10 8l4.5 4.5"/>', 14),
    down: svg('<path d="M5.5 7.5L10 12l4.5-4.5"/>', 14),
    task: svg('<path d="M7 3.5h6M6 5h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 14 17H6a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 6 5z"/><path d="M7.5 9.5h5M7.5 13h3.5"/>', 15),
    book: svg('<path d="M3.5 4.5h5a2 2 0 0 1 2 2v10a1.5 1.5 0 0 0-1.5-1.5h-5.5zM16.5 4.5h-5a2 2 0 0 0-2 2v10a1.5 1.5 0 0 1 1.5-1.5h5.5z"/>', 15),
    hint: svg('<circle cx="10" cy="10" r="7"/><path d="M10 13.5v.01M8.6 7.8a1.6 1.6 0 1 1 2.3 1.5c-.6.3-.9.7-.9 1.4"/>', 15),
    err: svg('<circle cx="10" cy="10" r="7"/><path d="M10 6.5v4M10 13.5h.01"/>', 15),
    x: svg('<path d="M6 6l8 8M14 6l-8 8"/>', 14),
    terminal: svg('<rect x="2.5" y="4" width="15" height="12" rx="1.8"/><path d="M6 8l2.8 2.2L6 12.5M10.5 12.5h3.5"/>', 16),
    locate: svg('<rect x="3.5" y="4" width="13" height="12" rx="1.5"/><path d="M6.5 8h7M6.5 12h4"/>', 16),
    quiz: svg('<path d="M4.5 5.5h11M4.5 10h11M4.5 14.5h7"/>', 16),
    sun: svg('<circle cx="10" cy="10" r="3.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/>', 16),
    moon: svg('<path d="M15.5 11.8A6 6 0 0 1 8.2 4.5a6 6 0 1 0 7.3 7.3z"/>', 16)
  };

  /* ------------------------------------------------------------- estado */
  const KEY = 'portugol-trainer-v1';
  const padrao = () => ({
    aluno: { nome: '', turma: null },
    prog: {},
    erros: {},
    ultimo: null,
    lab: null,
    cfg: { todos: false, tema: 'light', uiV2: true },
    prof: { pin: null, atividades: [], relatorios: {} }
  });

  let S = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)) || {};
      const st = Object.assign(padrao(), saved);
      st.cfg = Object.assign({ todos: false, tema: 'light' }, saved.cfg || {});
      st.aluno = Object.assign({ nome: '', turma: null }, saved.aluno || {});
      st.prof = Object.assign({ pin: null, atividades: [], relatorios: {} }, saved.prof || {});
      if (!st.cfg.uiV2) {
        st.cfg.tema = 'light';
        st.cfg.todos = false;
        st.cfg.uiV2 = true;
      }
      if (st.prog && st.prog['m3-7'] && !st.prog['m3-7'].done && /escreva Ol[aá]/i.test(st.prog['m3-7'].code || '')) {
        st.prog['m3-7'].code = null;
      }
      return st;
    } catch (e) {
      return padrao();
    }
  })();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  save();

  const prog = id => (S.prog[id] = S.prog[id] || { done: false, tent: 0, dicas: 0, etapa: 0, code: null });
  const erro = label => { S.erros[label] = (S.erros[label] || 0) + 1; save(); };

  const ALL = {};
  M.forEach(m => m.ex.forEach((e, i) => (ALL[e.id] = { ex: e, mod: m, i })));

  const modPct = m => {
    const d = m.ex.filter(e => prog(e.id).done).length;
    return { d, t: m.ex.length, p: Math.round(100 * d / m.ex.length) };
  };
  const idxTrack = m => track.indexOf(m);

  /* Bloqueio sequencial rigoroso: só avança com 100% de acerto */
  const liberado = m => {
    if (!m.track || S.cfg.todos) return true;
    const i = idxTrack(m);
    if (i <= 0) return true;
    return modPct(track[i - 1]).p === 100;
  };
  const exLiberado = (m, n) => {
    if (S.cfg.todos || n <= 1) return true;
    if (m.ex[n - 1] && prog(m.ex[n - 1].id).done) return true;
    return !!(m.ex[n - 2] && prog(m.ex[n - 2].id).done);
  };
  const primeiroExPendente = m => {
    const idx = m.ex.findIndex(e => !prog(e.id).done);
    return idx < 0 ? 1 : idx + 1;
  };

  const totais = () => {
    let d = 0, t = 0, tent = 0, acertos = 0;
    M.forEach(m => m.ex.forEach(e => {
      const p = prog(e.id);
      t++;
      if (p.done) { d++; acertos++; }
      tent += p.tent;
    }));
    return {
      d, t, tent, acertos,
      ap: tent ? Math.min(100, Math.round(100 * acertos / tent)) : 0,
      p: t ? Math.round(100 * d / t) : 0
    };
  };

  const proximoEx = () => {
    for (const m of track) {
      if (!liberado(m)) break;
      const e = m.ex.find(x => !prog(x.id).done);
      if (e) return { m, n: m.ex.indexOf(e) + 1 };
    }
    return null;
  };

  /* Grupos enxutos para organizar a tela inicial */
  const GRUPOS = [
    { titulo: '1. Primeiros Comandos', ids: ['m1', 'm2', 'm3', 'm4'] },
    { titulo: '2. Variáveis e Contas', ids: ['m5', 'm6', 'm7', 'm8'] },
    { titulo: '3. Decisões', ids: ['m9', 'm10', 'm11', 'm12', 'm13'] },
    { titulo: '4. Prática Final', ids: ['m14', 'm15', 'm16'] }
  ];

  /* Modelos curtos e diretos de sintaxe exibidos no exercício */
  const MODELOS = {
    m1: { inline: 'escreva("Olá, mundo!")' },
    m2: { block: 'programa\n{\n    funcao inicio()\n    {\n        escreva("Olá")\n    }\n}' },
    m3: { inline: 'escreva("Texto: ", 10)' },
    m4: { inline: 'cadeia nome   ->   leia(nome)' },
    m5: { inline: 'inteiro idade   |   real nota   |   cadeia nome   |   logico ok' },
    m6: { inline: 'inteiro: 15   |   real: 8.5   |   cadeia: "Ana"   |   caractere: \'A\'' },
    m7: { inline: 'idade = 18' },
    m8: { inline: 'resultado = a + b   (+  -  *  /  %)' },
    m9: { inline: '== (igual)   != (diferente)   >   <   >=   <=' },
    m10: { block: 'se (idade >= 18)\n{\n    escreva("Maior")\n}' },
    m11: { block: 'se (nota >= 7)\n{\n    escreva("Aprovado")\n}\nsenao\n{\n    escreva("Reprovado")\n}' },
    m12: { inline: 'se (idade >= 18 e idade <= 65)' },
    m13: { block: 'escolha (opcao)\n{\n    caso 1:\n        escreva("Um")\n        pare\n    caso contrario:\n        escreva("Outro")\n}' }
  };

  /* Resumos visuais objetivos para cada missão */
  const RESUMOS = {
    m1: {
      resumo: 'Um algoritmo é uma sequência de comandos executados de cima para baixo.',
      code: 'programa\n{\n    funcao inicio()\n    {\n        escreva("Olá, mundo!")\n    }\n}',
      itens: [
        'Os comandos ficam dentro de <code>funcao inicio() { ... }</code>.',
        '<code>escreva("texto")</code> mostra uma mensagem na tela.',
        'Digite o comando no editor e clique em <b>Verificar</b>.'
      ]
    },
    m2: {
      resumo: 'Todo programa em Portugol usa a mesma estrutura base.',
      code: 'programa\n{\n    funcao inicio()\n    {\n        // seus comandos aqui\n    }\n}',
      itens: [
        'Começa sempre com <code>programa</code> e abre chave <code>{</code>.',
        'Dentro dele fica <code>funcao inicio()</code> com suas próprias chaves <code>{ }</code>.',
        'Toda chave aberta <code>{</code> precisa ser fechada com <code>}</code>.'
      ]
    },
    m3: {
      resumo: 'O comando escreva() exibe textos, números e resultados na tela.',
      code: 'escreva("Olá!")\nescreva("\\nIdade: ", 17)\nescreva("\\nSoma: ", 5 + 3)',
      itens: [
        'Textos ficam entre aspas duplas: <code>"Olá"</code>.',
        'Números e contas não usam aspas: <code>escreva(10 + 5)</code>.',
        'Use vírgula para juntar itens e <code>\\n</code> para pular linha.'
      ]
    },
    m4: {
      resumo: 'O comando leia() recebe um valor digitado pelo usuário e guarda na variável.',
      code: 'cadeia nome\nescreva("Digite seu nome: ")\nleia(nome)\nescreva("Olá, ", nome)',
      itens: [
        'Declare a variável antes de usar o <code>leia()</code>.',
        'Dentro do <code>leia</code> vai apenas o nome da variável, <b>sem aspas</b>: <code>leia(nome)</code>.'
      ]
    },
    m5: {
      resumo: 'Variáveis guardam informações na memória. Primeiro vem o tipo, depois o nome.',
      code: 'inteiro idade\nreal altura\ncadeia nome\ncaractere letra\nlogico aprovado',
      itens: [
        '<code>inteiro</code>: números sem vírgula (ex: <code>18</code>).',
        '<code>real</code>: decimais com ponto (ex: <code>1.75</code>).',
        '<code>cadeia</code>: texto com aspas duplas (ex: <code>"Maria"</code>).'
      ]
    },
    m6: {
      resumo: 'Escolha o tipo certo de variável para cada informação.',
      code: 'inteiro quantidade = 3\nreal preco = 9.90\ncadeia produto = "Caderno"\ncaractere turma = \'A\'\nlogico pago = verdadeiro',
      itens: [
        'Aspas duplas <code>" "</code> para <code>cadeia</code>; aspas simples <code>\' \'</code> para <code>caractere</code> (1 letra).',
        '<code>logico</code> aceita apenas <code>verdadeiro</code> ou <code>falso</code>.'
      ]
    },
    m7: {
      resumo: 'O sinal = guarda um valor dentro da variável.',
      code: 'inteiro pontos\npontos = 10\nescreva(pontos)',
      itens: [
        'À esquerda do <code>=</code> fica a variável; à direita, o valor: <code>pontos = 10</code>.',
        'Um novo <code>=</code> substitui o valor antigo da variável.'
      ]
    },
    m8: {
      resumo: 'Use operadores matemáticos para o computador calcular o resultado.',
      code: 'inteiro soma = 10 + 5\ninteiro dobro = 10 * 2\nreal metade = 10.0 / 2\ninteiro resto = 10 % 3',
      itens: [
        '<code>+</code> soma, <code>-</code> subtração, <code>*</code> multiplicação, <code>/</code> divisão.',
        '<code>%</code> calcula o resto da divisão inteira.'
      ]
    },
    m9: {
      resumo: 'Operadores relacionais comparam dois valores (verdadeiro ou falso).',
      code: 'idade >= 18   // maior ou igual\nsenha == 123  // igual\nnota != 0     // diferente',
      itens: [
        'Para comparar igualdade use <b>dois sinais</b>: <code>==</code> (um <code>=</code> só serve para guardar valor).',
        'Outros: <code>!=</code> (diferente), <code>&gt;</code> (maior), <code>&lt;</code> (menor), <code>&gt;=</code> e <code>&lt;=</code>.'
      ]
    },
    m10: {
      resumo: 'A estrutura se() executa um bloco apenas quando a condição é verdadeira.',
      code: 'se (idade >= 18)\n{\n    escreva("Maior de idade")\n}',
      itens: [
        'A condição fica obrigatoriamente entre parênteses: <code>se (condicao)</code>.',
        'Os comandos do <code>se</code> ficam dentro de chaves <code>{ }</code>.'
      ]
    },
    m11: {
      resumo: 'O senao define o que executar quando a condição do se() for falsa.',
      code: 'se (nota >= 7)\n{\n    escreva("Aprovado")\n}\nsenao\n{\n    escreva("Reprovado")\n}',
      itens: [
        '<code>senao</code> vem logo após o fechamento <code>}</code> do <code>se</code>.',
        '<code>senao</code> <b>não</b> tem condição entre parênteses.'
      ]
    },
    m12: {
      resumo: 'Combine duas ou mais condições usando os operadores e, ou, nao.',
      code: 'se (idade >= 18 e temCarteira == verdadeiro)\n{\n    escreva("Pode dirigir")\n}',
      itens: [
        '<code>e</code>: exige que <b>todas</b> as condições sejam verdadeiras.',
        '<code>ou</code>: basta <b>uma</b> condição ser verdadeira.',
        '<code>nao</code>: inverte o resultado da condição.'
      ]
    },
    m13: {
      resumo: 'escolha / caso testa uma variável contra várias opções fixas (como um menu).',
      code: 'escolha (opcao)\n{\n    caso 1:\n        escreva("Iniciar")\n        pare\n    caso contrario:\n        escreva("Opção inválida")\n}',
      itens: [
        'Cada opção usa <code>caso valor:</code> (com dois-pontos) e termina com <code>pare</code>.',
        '<code>caso contrario:</code> trata qualquer valor diferente dos anteriores.'
      ]
    },
    m14: {
      resumo: 'Construa um programa completo passo a passo: variáveis, entrada, cálculo e saída.',
      code: 'inteiro n\nleia(n)\nescreva(n * 2)',
      itens: [
        'Siga a etapa pedida no topo do exercício e clique em <b>Verificar</b> a cada passo.'
      ]
    },
    m15: {
      resumo: 'Encontre e conserte os erros de sintaxe de cada código.',
      code: '',
      itens: [
        'Clique em <b>Verificar</b> para ver a linha exata do erro.',
        'Corrija um erro por vez sem apagar o objetivo do programa.'
      ]
    },
    m16: {
      resumo: 'Resolva os desafios finais aplicando variáveis, leitura, contas e decisões.',
      code: '',
      itens: [
        'Leia o que entra (<code>leia</code>), processe a regra e mostre o resultado (<code>escreva</code>).'
      ]
    },
    onde: {
      resumo: 'Identifique o lugar exato onde cada comando deve ficar na estrutura do programa.',
      code: '',
      itens: ['Clique na linha ou no espaço pontilhado correto.']
    },
    qz: {
      resumo: 'Perguntas rápidas para identificar erros comuns de sintaxe e lógica.',
      code: '',
      itens: ['Analise o trecho de código e marque a alternativa correta.']
    }
  };

  const iconeModulo = m => {
    if (m.id === 'onde') return IC.locate;
    if (m.id === 'qz') return IC.quiz;
    return esc(m.icone);
  };

  /* ------------------------------------------------------------- utilitários UI */
  const main = $('#main');
  let cleanup = null;

  function toast(msg, tipo) {
    const t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2800);
    setTimeout(() => t.remove(), 3200);
  }

  function modal(html, onMount) {
    const w = $('#modal');
    w.hidden = false;
    w.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => { w.hidden = true; w.innerHTML = ''; };
    w.onclick = e => { if (e.target === w) close(); };
    $$('[data-close]', w).forEach(b => (b.onclick = close));
    onMount && onMount(w, close);
    return close;
  }

  function setView(html, after) {
    if (cleanup) { cleanup(); cleanup = null; }
    main.innerHTML = html;
    window.scrollTo(0, 0);
    after && after();
  }

  const go = h => { if (location.hash === h) route(); else location.hash = h; };

  function renderTop() {
    const t = totais();
    const el = $('#topProgress');
    if (el) el.innerHTML = `${IC.check} <span>${t.d} / ${t.t}</span>`;
    const bt = $('#btnTema');
    if (bt) bt.innerHTML = S.cfg.tema === 'dark' ? IC.sun : IC.moon;
  }

  /* ------------------------------------------------------------- Editor + Saída Clean (IDE) */
  class IDE {
    constructor(root, o) {
      this.o = o || {};
      this.root = root;
      this.rodando = false;
      this.ctl = null;
      this.pend = null;
      const isEx = !!this.o.verify;

      root.innerHTML = `
      <div class="ide">
        <section class="pane editor-pane" aria-label="Editor de código">
          <div class="pane-head">
            <span class="pane-title-txt">Código Portugol</span>
            <div class="sym-group" aria-label="Inserir símbolos">
              <button type="button" class="sym-btn" data-ins="{}" data-back="1" title="Inserir chaves">{ }</button>
              <button type="button" class="sym-btn" data-ins="()" data-back="1" title="Inserir parênteses">( )</button>
              <button type="button" class="sym-btn" data-ins='""' data-back="1" title="Inserir aspas">" "</button>
              <button type="button" class="sym-btn" data-ins="\\n" data-back="0" title="Inserir quebra de linha">\\n</button>
            </div>
            <div class="pane-tools">
              <button type="button" class="link-btn" data-b="indent" title="Alinhar código">Organizar</button>
              ${this.o.reset ? '<button type="button" class="link-btn" data-b="reset" title="Voltar ao código inicial">Recomeçar</button>' : ''}
              ${!isEx ? '<button type="button" class="link-btn" data-b="clear">Limpar</button>' : ''}
            </div>
          </div>

          <div class="editor-host"></div>

          <div class="editor-foot">
            ${isEx
              ? `<button type="button" class="btn verify" data-b="verify" title="Atalho: Ctrl+Enter">${IC.check} Verificar</button>
                 <button type="button" class="btn ghost" data-b="run" title="Testar digitando entradas">${IC.play} Executar</button>
                 <button type="button" class="btn danger sm" data-b="stop" hidden>${IC.stop} Parar</button>`
              : `<button type="button" class="btn primary" data-b="run" title="Atalho: Ctrl+Enter">${IC.play} Executar</button>
                 <button type="button" class="btn danger sm" data-b="stop" hidden>${IC.stop} Parar</button>`
            }
            <span class="pos-info" data-s="pos">Linha 1</span>
          </div>
        </section>

        <section class="pane side-pane" aria-label="Saída e verificação">
          <div class="console-box">
            <div class="pane-head console-head">
              <span class="pane-title-txt">Saída na tela</span>
              <small data-s="state"></small>
            </div>
            <pre class="console" data-s="out" aria-live="polite"></pre>
            <form class="input-row" data-s="form" hidden>
              <label data-s="lbl">Digite o valor:</label>
              <div class="input-flex">
                <input data-s="inp" disabled autocomplete="off" placeholder="Digite e pressione Enter">
                <button class="btn primary sm" disabled data-s="send">Enviar</button>
              </div>
            </form>
          </div>

          <div class="mem-strip" data-p="mem" hidden></div>

          <div class="status-box" data-p="prof">
            <p class="status-idle">${isEx ? 'Escreva o comando à esquerda e clique em <b>Verificar</b>.' : 'Clique em <b>Executar</b> para rodar o programa.'}</p>
          </div>
        </section>
      </div>`;

      this.q = s => $(s, root);
      this.ed = new CodeEditor($('.editor-host', root), {
        value: this.o.starter || '',
        onChange: v => { this.o.onChange && this.o.onChange(v); }
      });
      this.out = this.q('[data-s=out]');
      this.inp = this.q('[data-s=inp]');
      this.form = this.q('[data-s=form]');

      $$('[data-b]', root).forEach(b => b.addEventListener('click', () => this.btn(b.dataset.b)));
      $$('[data-ins]', root).forEach(b => {
        b.addEventListener('mousedown', e => e.preventDefault());
        b.addEventListener('click', () => {
          const txt = b.dataset.ins, back = +b.dataset.back || 0;
          this.ed.insert(txt);
          if (back > 0) {
            const pos = this.ed.ta.selectionStart - back;
            this.ed.ta.setSelectionRange(pos, pos);
            this.ed.update();
          }
          pos();
        });
      });

      this.form.addEventListener('submit', e => { e.preventDefault(); this.enviar(); });

      const ta = this.ed.ta;
      const pos = () => {
        const b = ta.value.slice(0, ta.selectionStart).split('\n');
        this.q('[data-s=pos]').textContent = `Linha ${b.length}`;
      };
      ['keyup', 'click', 'focus', 'input'].forEach(ev => ta.addEventListener(ev, pos));
      ta.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          if (this.o.verify) this.o.verify(this.ed.getValue());
          else this.executar();
        }
      });
    }

    btn(b) {
      if (b === 'run') this.executar();
      else if (b === 'stop') this.parar();
      else if (b === 'clear') this.limpar();
      else if (b === 'indent') this.ed.indentar();
      else if (b === 'reset') {
        if (confirm('Voltar ao código inicial deste exercício?')) {
          this.ed.setValue(this.o.starter || '');
          this.limpar();
          this.ed.focusSmart();
        }
      } else if (b === 'verify') {
        if (this.rodando) this.parar();
        this.o.verify && this.o.verify(this.ed.getValue());
      }
    }

    state(txt, cls) {
      const s = this.q('[data-s=state]');
      s.textContent = txt || '';
      s.className = cls || '';
    }

    print(t) {
      this.out.appendChild(document.createTextNode(t));
      this.out.scrollTop = this.out.scrollHeight;
    }

    sys(t, cls) {
      if (this.out.textContent && !this.out.textContent.endsWith('\n')) this.out.appendChild(document.createTextNode('\n'));
      const s = document.createElement('span');
      s.className = 'sys ' + (cls || '');
      s.textContent = t + '\n';
      this.out.appendChild(s);
      this.out.scrollTop = this.out.scrollHeight;
    }

    limpar() {
      if (this.rodando) return;
      this.out.textContent = '';
      this.ed.clearMarks();
      this.q('[data-p=mem]').hidden = true;
      this.q('[data-p=mem]').innerHTML = '';
      this.state('');
    }

    mostrarAmostra(sample) {
      this.out.textContent = '';
      if (!sample) {
        this.q('[data-p=mem]').hidden = true;
        return;
      }
      if (sample.inputs && sample.inputs.length) {
        this.sys(`Entrada: ${sample.inputs.join(', ')}`, 'dim');
      }
      if (sample.out) this.print(sample.out);
      this.memoria(sample.vars || []);
      this.state(sample.erro ? 'erro' : 'ok', sample.erro ? 'err' : 'ok');
    }

    pedir(nome, tipo) {
      return new Promise((resolve, reject) => {
        this.pend = { resolve, reject };
        this.form.hidden = false;
        this.q('[data-s=lbl]').innerHTML = `Digite <b>${esc(nome)}</b> (${tipo}):`;
        this.inp.disabled = false;
        this.q('[data-s=send]').disabled = false;
        this.inp.value = '';
        this.inp.focus();
        this.q('.console-box').classList.add('waiting');
        this.state('aguardando entrada', 'wait');
      });
    }

    enviar() {
      if (!this.pend) return;
      const v = this.inp.value;
      this.print(v + '\n');
      const p = this.pend;
      this.pend = null;
      this.inp.disabled = true;
      this.q('[data-s=send]').disabled = true;
      this.inp.value = '';
      this.form.hidden = true;
      this.q('.console-box').classList.remove('waiting');
      this.state('executando', 'run');
      p.resolve(v);
    }

    parar() {
      if (!this.rodando) return;
      this.ctl.stopped = true;
      if (this.pend) {
        const p = this.pend;
        this.pend = null;
        p.resolve('');
        this.inp.disabled = true;
        this.q('[data-s=send]').disabled = true;
        this.form.hidden = true;
        this.q('.console-box').classList.remove('waiting');
      }
    }

    irParaLinha(ln) {
      const v = this.ed.getValue().split('\n');
      let s = 0;
      for (let i = 0; i < ln - 1; i++) s += (v[i] || '').length + 1;
      this.ed.focus();
      this.ed.ta.setSelectionRange(s, s + (v[ln - 1] || '').length);
      this.ed.update();
    }

    mostraErros(erros, avisos, extraHtml) {
      const el = this.q('[data-p=prof]');
      if (extraHtml && !erros.length) {
        el.innerHTML = extraHtml;
        return;
      }
      if (!erros.length && !(avisos || []).length) {
        el.innerHTML = `<div class="st-ok">${IC.check} Sintaxe correta.</div>`;
        return;
      }
      const it = (e, w) => `
        <div class="perr ${w ? 'warn' : ''}" data-line="${e.line}">
          <div class="perr-top"><span class="ln">Linha ${e.line}</span><b>${esc(e.titulo)}</b></div>
          <p>${esc(e.explicacao)}</p>
          ${e.dica ? `<p class="dica"><b>Dica:</b> ${esc(e.dica)}</p>` : ''}
        </div>`;

      if (erros.length) {
        const resto = erros.length - 1;
        const hintAction = this.o.verify
          ? `<div class="err-actions"><button type="button" class="err-hint-btn" data-open-hint="1">${IC.hint} Ver dica passo a passo</button></div>`
          : '';
        el.innerHTML = it(erros[0]) + (resto > 0 ? `<p class="more-err">Mais ${resto} erro(s) na sequência — corrija este primeiro e verifique novamente.</p>` : '') + hintAction;
      } else {
        el.innerHTML = (avisos || []).slice(0, 1).map(w => it(w, true)).join('');
      }
      $$('.perr', el).forEach(a => a.addEventListener('click', () => this.irParaLinha(+a.dataset.line)));
    }

    memoria(snap) {
      const el = this.q('[data-p=mem]');
      if (!snap || !snap.length) {
        el.hidden = true;
        el.innerHTML = '';
        return;
      }
      el.hidden = false;
      el.innerHTML = `<span class="mem-lbl">Variáveis:</span>` + snap.map(v => {
        const val = v.type === 'cadeia' ? `"${esc(v.texto)}"` : v.type === 'caractere' ? `'${esc(v.texto)}'` : esc(v.texto);
        return `<span class="mem-chip"><b>${esc(v.name)}</b> = ${val}</span>`;
      }).join('');
    }

    async executar() {
      if (this.rodando) return;
      this.out.textContent = '';
      this.ed.clearMarks();
      const src = this.ed.getValue();
      const c = Portugol.compile(src);
      this.ed.setMarks(c.errors, c.warnings);
      this.mostraErros(c.errors, c.warnings);
      if (!c.ok) {
        c.errors.forEach(e => erro(e.titulo));
        this.state('erro', 'err');
        return;
      }

      this.rodando = true;
      this.ctl = { stopped: false, delay: 0 };
      const runBtn = $('[data-b=run]', this.root);
      const stopBtn = $('[data-b=stop]', this.root);
      if (runBtn) runBtn.disabled = true;
      if (stopBtn) stopBtn.hidden = false;
      this.state('executando', 'run');

      const io = {
        write: s => this.print(s),
        read: (n, t) => this.pedir(n, t),
        onMemory: s => this.memoria(s),
        trace: () => {}
      };
      let res;
      try {
        res = await Portugol.run(c.ast, io, this.ctl);
      } catch (e) {
        res = { ok: false, error: { line: 1, titulo: 'Erro inesperado', explicacao: String(e.message), dica: '' } };
      }

      this.rodando = false;
      if (runBtn) runBtn.disabled = false;
      if (stopBtn) stopBtn.hidden = true;
      if (res.vars) this.memoria(res.vars);

      if (res.stopped) {
        this.state('parado');
      } else if (res.error) {
        erro(res.error.titulo);
        this.state('erro', 'err');
        this.ed.setMarks([res.error], c.warnings);
        this.mostraErros([res.error], c.warnings);
      } else {
        this.state('concluído', 'ok');
        if (this.o.verify) {
          this.q('[data-p=prof]').innerHTML = `<p class="status-idle">Teste concluído. Clique em <b>Verificar</b> para validar a resposta.</p>`;
        }
      }
    }
  }

  /* ------------------------------------------------------------- dicas progressivas e conclusão */
  function listaDicas(ex, mod, etapa) {
    const raw = ((etapa ? etapa.h : ex.h) || []).slice();
    if (!raw.length && ex.dica) raw.push(ex.dica);
    for (const g of (mod.dicas || [])) {
      if (raw.length >= 2) break;
      raw.push(g);
    }
    const titulos = ['O que observar', 'Como resolver', 'Detalhe importante'];
    const lista = raw.slice(0, 3).map((texto, idx) => ({
      titulo: titulos[idx] || `Passo ${idx + 1}`,
      texto
    }));
    const codeEx = etapa ? etapa.ex : ex.ex;
    if (ex.tipo === 'code' && (codeEx || mod.exemplo)) {
      lista.push({
        titulo: 'Exemplo parecido (adapte para o exercício)',
        code: codeEx || mod.exemplo
      });
    } else if (codeEx) {
      lista.push({
        titulo: 'Exemplo de referência',
        code: codeEx
      });
    }
    return lista;
  }

  function bindDicas(root, ex, mod, getEtapa) {
    let shown = 0, aberto = false, stageKey = null;
    const btn = $('[data-act=hint]', root), box = $('.hints', root);
    if (!btn || !box) return { sync() {} };

    const getLista = () => {
      const et = getEtapa ? getEtapa() : null;
      const key = et ? et.titulo : '';
      if (key !== stageKey) {
        stageKey = key;
        shown = 0;
        aberto = false;
      }
      return listaDicas(ex, mod, et);
    };

    const renderBtn = l => {
      if (shown === 0) {
        btn.innerHTML = `${IC.hint} <span>Pedir dica</span>`;
      } else if (!aberto) {
        btn.innerHTML = `${IC.hint} <span>Ver dicas (${shown}/${l.length})</span>`;
      } else if (shown < l.length) {
        btn.innerHTML = `${IC.hint} <span>Próxima dica (${shown}/${l.length})</span>`;
      } else {
        btn.innerHTML = `${IC.hint} <span>Ocultar dicas (${l.length}/${l.length})</span>`;
      }
    };

    const render = () => {
      const l = getLista();
      renderBtn(l);
      if (!aberto || shown === 0) {
        box.hidden = true;
        box.innerHTML = '';
        return;
      }
      box.hidden = false;
      box.innerHTML = `
        <div class="hints-card">
          <div class="hints-list">
            ${l.slice(0, shown).map((d, i) => `
              <div class="hint-step">
                <div class="hint-head">
                  <span class="hint-badge">Dica ${i + 1} de ${l.length}</span>
                  <b>${esc(d.titulo)}</b>
                </div>
                ${d.code ? `<pre class="code">${Hl.html(d.code)}</pre>` : `<p>${esc(d.texto)}</p>`}
              </div>`).join('')}
          </div>
          <div class="hints-foot">
            ${shown < l.length
              ? `<button type="button" class="btn ghost sm" data-hint-next>${IC.hint} Ver dica ${shown + 1} de ${l.length}</button>`
              : `<span class="hints-end">Todas as ${l.length} dicas deste exercício estão abertas.</span>`}
            <button type="button" class="link-btn" data-hint-close>Ocultar</button>
          </div>
        </div>`;

      const nextB = $('[data-hint-next]', box);
      if (nextB) nextB.onclick = () => avancar(false);
      const closeB = $('[data-hint-close]', box);
      if (closeB) closeB.onclick = () => { aberto = false; render(); };
    };

    const avancar = (toggleSeFim) => {
      const l = getLista();
      if (shown === 0) {
        shown = 1;
        aberto = true;
        prog(ex.id).dicas++;
        save();
      } else if (!aberto) {
        aberto = true;
      } else if (shown < l.length) {
        shown++;
        prog(ex.id).dicas++;
        save();
      } else if (toggleSeFim) {
        aberto = false;
      }
      render();
      if (aberto && !box.hidden) {
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    btn.addEventListener('click', () => avancar(true));
    [$('[data-s=body]', root), $('[data-s=fb]', root)].filter(Boolean).forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('[data-open-hint]')) avancar(false);
      });
    });

    render();
    return { sync: render };
  }

  function concluir(ex) {
    const p = prog(ex.id), jaFeito = p.done;
    p.done = true;
    p.quando = Date.now();
    save();
    renderTop();
    if (!jaFeito) {
      const m = ALL[ex.id].mod, pc = modPct(m);
      if (pc.p === 100) toast(`Missão "${m.titulo}" concluída!`, 'ok');
      else toast('Resposta correta!', 'ok');
    }
  }

  function navProx(m, n) {
    if (n < m.ex.length) return { h: `#/m/${m.id}/${n + 1}`, t: `Próximo ${IC.arrowR}` };
    const i = idxTrack(m);
    if (m.track && track[i + 1]) return { h: `#/m/${track[i + 1].id}`, t: `Próxima missão ${IC.arrowR}` };
    return { h: '#/', t: `Concluir ${IC.arrowR}` };
  }

  /* ------------------------------------------------------------- Tela 1: Missões (Clean e Direta) */
  function viewHome() {
    const t = totais(), prox = proximoEx();
    const proxHref = prox
      ? (prox.m.ex.some(e => prog(e.id).done) ? `#/m/${prox.m.id}/${prox.n}` : `#/m/${prox.m.id}`)
      : '#/painel';

    const turmaHtml = S.aluno.turma ? `
      <section class="card turma-bar">
        <div><b>Turma:</b> ${esc(S.aluno.turma.nome)} <small>(${S.aluno.turma.ids.filter(id => ALL[id] && prog(id).done).length}/${S.aluno.turma.ids.length})</small></div>
        <div class="chips">
          ${S.aluno.turma.ids.filter(id => ALL[id]).map(id => {
            const info = ALL[id], ok = prog(id).done, can = liberado(info.mod) && exLiberado(info.mod, info.i + 1);
            return `<a class="chip ${ok ? 'ok' : ''} ${!can ? 'chip-lock' : ''}" href="${can ? `#/m/${info.mod.id}/${info.i + 1}` : '#/'}" data-can="${can ? 1 : 0}">${ok ? IC.check : can ? '' : IC.lock} ${esc(info.mod.icone)}.${info.i + 1}</a>`;
          }).join('')}
        </div>
      </section>` : '';

    const cardModulo = m => {
      const pc = modPct(m), lock = !liberado(m), proxN = primeiroExPendente(m);
      const isCur = prox && prox.m.id === m.id;
      const href = lock ? '#/' : (pc.d > 0 && pc.d < pc.t ? `#/m/${m.id}/${proxN}` : `#/m/${m.id}`);
      return `
        <a class="mcard ${lock ? 'lock' : ''} ${pc.p === 100 ? 'done' : ''} ${isCur ? 'current' : ''}" href="${href}" ${lock ? 'data-lock="1"' : ''}>
          <div class="mc-row">
            <span class="mc-n">${pc.p === 100 ? IC.check : lock ? IC.lock : iconeModulo(m)}</span>
            <div class="mc-txt">
              <b>${esc(m.titulo)}</b>
              <small>${esc(m.sub)}</small>
            </div>
            <span class="mc-cnt">${pc.d}/${pc.t}</span>
          </div>
          <div class="mc-bar"><u style="width:${pc.p}%"></u></div>
        </a>`;
    };

    setView(`
      <header class="home-bar">
        <div>
          <h1>${S.aluno.nome ? `Olá, ${esc(S.aluno.nome)}` : 'Missões de Portugol'}</h1>
          <p>${prox ? `Missão atual: <b>${esc(prox.m.titulo)}</b>` : 'Todas as missões foram concluídas.'}</p>
        </div>
        ${prox ? `<a class="btn primary lg" href="${proxHref}">${t.d ? 'Continuar' : 'Começar'} ${IC.arrowR}</a>` : ''}
      </header>

      ${turmaHtml}

      ${GRUPOS.map(g => `
        <section class="group-sec">
          <h2 class="group-title">${esc(g.titulo)}</h2>
          <div class="mgrid">
            ${g.ids.map(id => M.find(x => x.id === id)).filter(Boolean).map(cardModulo).join('')}
          </div>
        </section>`).join('')}

      <section class="group-sec">
        <h2 class="group-title">Treinos Extras</h2>
        <div class="mgrid">
          ${M.filter(m => !m.track).map(cardModulo).join('')}
          <a class="mcard" href="#/lab">
            <div class="mc-row">
              <span class="mc-n">${IC.terminal}</span>
              <div class="mc-txt"><b>Laboratório Livre</b><small>Editor aberto para praticar</small></div>
            </div>
          </a>
        </div>
      </section>
    `, () => {
      $$('[data-lock="1"]', main).forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        toast('Conclua todos os exercícios da missão anterior primeiro.', 'warn');
      }));
      $$('[data-can="0"]', main).forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        toast('Siga a ordem dos exercícios anteriores para desbloquear.', 'warn');
      }));
    });
  }

  /* ------------------------------------------------------------- Tela 2: Resumo Rápido da Missão */
  function mountWidgets(root) {
    $$('[data-widget]', root).forEach(w => { const f = WIDGETS[w.dataset.widget]; if (f) f(w); });
    $$('[data-act=try]', root).forEach(b => b.addEventListener('click', () => {
      S.lab = decodeURIComponent(b.dataset.code);
      save();
      go('#/lab');
    }));
  }

  function resumoHtml(m) {
    const r = RESUMOS[m.id];
    if (!r) return `<div class="lesson-body">${m.licao}</div>`;
    return `
      <div class="resumo-body">
        <p class="resumo-lead">${esc(r.resumo)}</p>
        ${r.code ? `<pre class="code resumo-code">${Hl.html(r.code)}</pre>` : ''}
        <ul class="resumo-list">
          ${r.itens.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      <details class="more-licao">
        <summary>Ver explicação detalhada e exemplos</summary>
        <div class="lesson-body">${m.licao}</div>
      </details>`;
  }

  function viewLicao(m) {
    const pc = modPct(m), prox = primeiroExPendente(m);
    setView(`
      <article class="resumo-card">
        <div class="subbar">
          <a class="link-back" href="#/">${IC.arrowL} Missões</a>
          <span class="small">${pc.d} de ${pc.t} concluídos</span>
        </div>

        <section class="card resumo-box">
          <header class="lesson-head">
            <span class="mc-n">${iconeModulo(m)}</span>
            <div>
              <h1>${esc(m.titulo)}</h1>
              <p>${esc(m.sub)}</p>
            </div>
          </header>

          ${resumoHtml(m)}

          <div class="resumo-foot">
            <a class="btn primary lg" href="#/m/${m.id}/${prox}">${pc.d ? `Continuar exercício ${prox}` : 'Praticar agora'} ${IC.arrowR}</a>
          </div>
        </section>
      </article>`, () => {
      mountWidgets(main);
    });
  }

  /* ------------------------------------------------------------- Tela 3: Exercício com Instrução em Destaque */
  function stepperHtml(m, n) {
    return `
      <div class="stepper" aria-label="Exercícios">
        ${m.ex.map((e, i) => {
          const num = i + 1, done = prog(e.id).done, open = exLiberado(m, num), cur = num === n;
          return `<a href="${open ? `#/m/${m.id}/${num}` : `#/m/${m.id}/${n}`}"
                     class="${done ? 'ok' : ''} ${cur ? 'cur' : ''} ${!open ? 'lock' : ''}"
                     data-open="${open ? 1 : 0}"
                     title="${open ? `Questão ${e.num}: ${esc(e.titulo)}` : 'Bloqueado'}">
            ${done ? IC.check : open ? num : IC.lock}
          </a>`;
        }).join('')}
      </div>`;
  }

  function modeloHtml(m, ex) {
    if (ex.tipo !== 'code') return '';
    const mod = ex.modelo || MODELOS[m.id];
    if (!mod) return '';
    if (mod.inline) {
      return `<div class="model-inline"><span>Exemplo de sintaxe:</span> <code>${esc(mod.inline)}</code></div>`;
    }
    return `
      <details class="model-details">
        <summary>Ver modelo da sintaxe</summary>
        <pre class="code">${Hl.html(mod.block)}</pre>
      </details>`;
  }

  function instrucaoHtml(ex) {
    if (ex.enunciado) {
      return `
        <h2 class="prompt-title">${esc(ex.titulo)}</h2>
        <div class="enun">${ex.enunciado}</div>`;
    }
    if (ex.pergunta) {
      const plainPerg = String(ex.pergunta).replace(/<[^>]+>/g, '').trim();
      const temTituloDistinto = ex.titulo && !plainPerg.startsWith(ex.titulo.replace(/…$/, '').trim());
      return `
        ${temTituloDistinto ? `<h2 class="prompt-title">${esc(ex.titulo)}</h2>` : ''}
        <div class="enun enun-main">${ex.pergunta}</div>`;
    }
    return `<h2 class="prompt-title">${esc(ex.titulo)}</h2>`;
  }

  function viewEx(m, n) {
    const ex = m.ex[n - 1];
    if (!ex) return go('#/m/' + m.id);
    if (!exLiberado(m, n)) {
      toast('Resolva o exercício atual antes de avançar.', 'warn');
      return go(`#/m/${m.id}/${primeiroExPendente(m)}`);
    }

    S.ultimo = { m: m.id, n };
    save();
    const p = prog(ex.id);
    const nx = navProx(m, n);
    const kickerTxt = m.track
      ? `Questão ${ex.num} · Missão ${esc(m.icone)} (${n} de ${m.ex.length})`
      : `Questão ${ex.num} · Exercício ${n} de ${m.ex.length}`;

    setView(`
      <div class="ex-bar">
        <a class="link-back" href="#/">${IC.arrowL} Missões</a>
        ${stepperHtml(m, n)}
        <div class="ex-tools">
          <button type="button" class="link-btn" id="btnVerLicao">${IC.book} Explicação</button>
        </div>
      </div>

      <section class="prompt-box ${p.done ? 'is-done' : ''}" aria-label="Instruções do exercício">
        <div class="prompt-top">
          <span class="prompt-kicker">${IC.task} ${kickerTxt}</span>
          <div class="prompt-actions">
            <button type="button" class="hint-pill" data-act="hint">${IC.hint} <span>Pedir dica</span></button>
            <span class="done-tag" data-s="done" ${p.done ? '' : 'hidden'}>${IC.check} Concluído</span>
          </div>
        </div>
        <div class="prompt-main">
          ${instrucaoHtml(ex)}
        </div>
        ${modeloHtml(m, ex)}
        <div data-s="etapas"></div>
        <div class="hints" hidden aria-live="polite"></div>
      </section>

      <div data-s="body"></div>
      <div class="feedback" data-s="fb" aria-live="polite"></div>

      <div class="ex-foot">
        ${n > 1 ? `<a class="btn ghost sm" href="#/m/${m.id}/${n - 1}">${IC.arrowL} Anterior</a>` : `<a class="btn ghost sm" href="#/m/${m.id}">${IC.arrowL} Resumo</a>`}
        <div data-s="nextWrap">
          ${p.done
            ? `<a class="btn primary" data-s="next" href="${nx.h}">${nx.t}</a>`
            : `<button class="btn locked" disabled>${IC.lock} Acerte para avançar</button>`}
        </div>
      </div>`, () => {
      $('#btnVerLicao').onclick = () => modal(`
        <div class="ml-head"><h3>${esc(m.titulo)}</h3><button class="btn ghost sm" data-close>Fechar</button></div>
        <div class="modal-body">${resumoHtml(m)}</div>`, w => mountWidgets(w));

      $$('.stepper [data-open="0"]', main).forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        toast('Acerte o exercício atual para liberar o próximo.', 'warn');
      }));

      const R = { m, n, ex, p, root: main };
      ({ code: exCode, quiz: exQuiz, place: exPlace, order: exOrder, match: exMatch })[ex.tipo](R);
    });
  }

  const marcaOk = R => {
    $('[data-s=done]', R.root).hidden = false;
    $('.prompt-box', R.root).classList.add('is-done');
    const nx = navProx(R.m, R.n);
    $('[data-s=nextWrap]', R.root).innerHTML = `<a class="btn primary" data-s="next" href="${nx.h}">${nx.t}</a>`;
  };

  const fb = (R, html, cls) => {
    const f = $('[data-s=fb]', R.root);
    f.className = 'feedback show ' + (cls || '');
    f.innerHTML = cls === 'bad'
      ? `<div class="fb-row"><div>${html}</div><button type="button" class="err-hint-btn" data-open-hint="1">${IC.hint} Ver dica</button></div>`
      : html;
  };

  const nextBtnHtml = R => {
    const nx = navProx(R.m, R.n);
    return `<a class="btn primary sm" href="${nx.h}">${nx.t}</a>`;
  };

  /* ---- Exercício de Código */
  function exCode(R) {
    const { ex, m, p } = R;
    const body = $('[data-s=body]', R.root);
    const etapas = ex.etapas;
    const draft = p.code != null ? p.code : (ex.starter || '');
    let timer, ide, dicasCtl;

    const stageIdx = () => Math.min(p.etapa || 0, etapas ? etapas.length - 1 : 0);
    const renderEtapas = () => {
      if (!etapas) return;
      const cur = p.done ? etapas.length - 1 : stageIdx();
      const e = etapas[cur];
      $('[data-s=etapas]', R.root).innerHTML = `
        <div class="stage-bar">
          <b>Etapa ${cur + 1} de ${etapas.length} — ${esc(e.titulo)}:</b>
          <span>${e.texto}</span>
        </div>`;
      dicasCtl && dicasCtl.sync();
    };
    renderEtapas();

    ide = new IDE(body, {
      starter: draft,
      reset: true,
      onChange: v => {
        clearTimeout(timer);
        timer = setTimeout(() => { p.code = v; save(); }, 300);
      },
      verify: async src => {
        if (!src.trim()) {
          toast('Digite o comando no editor.', 'warn');
          ide.ed.focus();
          return;
        }
        p.tent++;
        p.code = src;
        save();
        const regras = etapas ? etapas[stageIdx()].rules : ex.rules;
        const r = await Grader.avaliar(regras, src);
        ide.ed.setMarks(r.compilou ? [] : r.comp.errors, r.comp ? r.comp.warnings : []);

        if (!r.compilou) {
          ide.out.textContent = '';
          ide.state('erro de sintaxe', 'err');
          ide.mostraErros(r.comp.errors, r.comp.warnings);
          r.comp.errors.forEach(e => erro(e.titulo));
          return;
        }

        ide.mostrarAmostra(r.sample);

        if (r.pass) {
          if (etapas && stageIdx() < etapas.length - 1) {
            p.etapa = stageIdx() + 1;
            save();
            renderEtapas();
            ide.mostraErros([], [], `<div class="st-ok"><b>${IC.check} Etapa concluída!</b> Siga para a Etapa ${p.etapa + 1} na instrução acima.</div>`);
          } else {
            if (etapas) p.etapa = etapas.length - 1;
            concluir(ex);
            marcaOk(R);
            renderEtapas();
            ide.mostraErros([], [], `
              <div class="st-win">
                <b>${IC.check} Resposta correta!</b>
                ${nextBtnHtml(R)}
              </div>`);
          }
        } else {
          erro('Lógica: ' + m.titulo);
          const falha = r.results.find(x => x.ok === false);
          ide.mostraErros([], [], `
            <div class="st-bad">
              <b>${IC.err} ${esc(falha ? falha.label : 'Ainda não está certo')}</b>
              ${falha && falha.msg ? `<p>${esc(falha.msg)}</p>` : ''}
              <div class="err-actions"><button type="button" class="err-hint-btn" data-open-hint="1">${IC.hint} Ver dica passo a passo</button></div>
            </div>`);
        }
      }
    });

    if ($('#modal').hidden) {
      setTimeout(() => ide.ed.focusSmart(), 20);
    }

    dicasCtl = bindDicas(R.root, ex, m, etapas ? () => etapas[stageIdx()] : null);
    cleanup = () => { ide.parar(); clearTimeout(timer); };
  }

  /* ---- Quiz */
  function exQuiz(R) {
    const { ex, p } = R;
    const body = $('[data-s=body]', R.root);
    const L = 'ABCDEFG';
    body.innerHTML = `
      <section class="card quiz">
        ${ex.code ? `<pre class="code q-code">${Hl.html(ex.code)}</pre>` : ''}
        <div class="opts">
          ${ex.opcoes.map((o, i) => `<button class="opt" data-i="${i}"><i>${L[i]}</i><span>${o}</span></button>`).join('')}
        </div>
      </section>`;

    bindDicas(R.root, ex, R.m, null);

    $$('.opt', body).forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      const i = +b.dataset.i, ok = i === ex.resp;
      p.tent++;
      save();
      if (ok) {
        $$('.opt', body).forEach(x => (x.disabled = true));
        b.classList.add('right');
        concluir(ex);
        marcaOk(R);
        fb(R, `<div class="fb-row"><div><b>${IC.check} Correto!</b> ${ex.expl}</div>${nextBtnHtml(R)}</div>`, 'ok');
      } else {
        b.disabled = true;
        b.classList.add('wrong');
        erro(ex.tag || ALL[ex.id].mod.titulo);
        fb(R, `<b>${IC.err} Alternativa incorreta.</b> Tente outra opção.`, 'bad');
      }
    }));
  }

  /* ---- Place */
  function exPlace(R) {
    const { ex, p } = R;
    const body = $('[data-s=body]', R.root);
    const linhas = ex.sk.map(s => {
      if (s.startsWith('@@')) {
        const [id, ind, lab] = s.slice(2).split('|');
        return `<div class="slotline"><button class="slot" data-z="${id}" style="margin-left:${(+ind) * 0.62}em">+ ${esc(lab || 'inserir aqui')}</button></div>`;
      }
      if (s.startsWith('##')) {
        const k = s.indexOf('|');
        return `<div class="zline" tabindex="0" role="button" data-z="${s.slice(2, k)}">${Hl.render(s.slice(k + 1), {})}</div>`;
      }
      return `<div class="sk-line">${Hl.render(s, {})}</div>`;
    }).join('');

    body.innerHTML = `
      <section class="card place">
        <div class="skel code">${linhas}</div>
      </section>`;

    bindDicas(R.root, ex, R.m, null);

    const pick = z => {
      if (z.classList.contains('locked')) return;
      const id = z.dataset.z, ok = id === ex.resp;
      p.tent++;
      save();
      const msg = ex.expl[id] || ex.expl._ || (ok ? 'Correto!' : 'Local incorreto.');
      if (ok) {
        $$('[data-z]', body).forEach(x => x.classList.add('locked'));
        z.classList.remove('wrong');
        z.classList.add('right');
        concluir(ex);
        marcaOk(R);
        fb(R, `<div class="fb-row"><div><b>${IC.check} Correto!</b> ${msg}</div>${nextBtnHtml(R)}</div>`, 'ok');
      } else {
        z.classList.add('wrong');
        erro('Posicionar: ' + ALL[ex.id].mod.titulo);
        fb(R, `<b>${IC.err} Ainda não:</b> ${msg}`, 'bad');
      }
    };

    $$('[data-z]', body).forEach(z => {
      z.addEventListener('click', () => pick(z));
      z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(z); } });
    });
  }

  /* ---- Order */
  function exOrder(R) {
    const { ex, p } = R;
    const body = $('[data-s=body]', R.root);
    const n = ex.linhas.length;
    let seed = parseInt(hash(ex.id), 36) || 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    let ord = [...Array(n).keys()];
    do {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [ord[i], ord[j]] = [ord[j], ord[i]];
      }
    } while (ord.every((v, i) => v === i));

    bindDicas(R.root, ex, R.m, null);

    const draw = travado => {
      body.innerHTML = `
        <section class="card order">
          <ol class="olist">
            ${ord.map((k, i) => `
              <li draggable="${!travado}" data-i="${i}">
                <span class="num">${i + 1}</span>
                <code>${Hl.render(ex.linhas[k].trim(), {}).replace(/^<div class="l">|<\/div>$/g, '')}</code>
                ${travado ? '' : `<span class="mv"><button type="button" data-up="${i}" aria-label="Mover para cima">${IC.up}</button><button type="button" data-dn="${i}" aria-label="Mover para baixo">${IC.down}</button></span>`}
              </li>`).join('')}
          </ol>
          ${travado ? '' : `<div class="ex-actions"><button class="btn verify" data-s="chk">${IC.check} Verificar ordem</button></div>`}
        </section>`;
      if (travado) return;

      const mv = (a, b) => { if (b < 0 || b >= n) return; [ord[a], ord[b]] = [ord[b], ord[a]]; draw(false); };
      $$('[data-up]', body).forEach(x => (x.onclick = () => mv(+x.dataset.up, +x.dataset.up - 1)));
      $$('[data-dn]', body).forEach(x => (x.onclick = () => mv(+x.dataset.dn, +x.dataset.dn + 1)));

      let from = null;
      $$('li', body).forEach(li => {
        li.addEventListener('dragstart', e => { from = +li.dataset.i; e.dataTransfer.effectAllowed = 'move'; });
        li.addEventListener('dragover', e => e.preventDefault());
        li.addEventListener('drop', e => {
          e.preventDefault();
          const to = +li.dataset.i;
          if (from === null || from === to) return;
          const [x] = ord.splice(from, 1);
          ord.splice(to, 0, x);
          draw(false);
        });
      });

      $('[data-s=chk]', body).onclick = () => {
        p.tent++;
        save();
        const wrong = ord.findIndex((k, i) => ex.linhas[k].trim() !== ex.linhas[i].trim());
        if (wrong < 0) {
          concluir(ex);
          marcaOk(R);
          draw(true);
          fb(R, `<div class="fb-row"><b>${IC.check} Ordem correta!</b>${nextBtnHtml(R)}</div>`, 'ok');
        } else {
          erro('Montagem: ' + ALL[ex.id].mod.titulo);
          $$('li', body).forEach((li, i) => li.classList.toggle('bad', i === wrong));
          fb(R, `<b>${IC.err} Linha ${wrong + 1} fora do lugar.</b> ${ex.dica}`, 'bad');
        }
      };
    };
    draw(false);
  }

  /* ---- Match */
  function exMatch(R) {
    const { ex, p } = R;
    const body = $('[data-s=body]', R.root);
    const ops = [...new Set(ex.itens.map(i => i[1]))].sort();
    body.innerHTML = `
      <section class="card match">
        <div class="mrows">
          ${ex.itens.map((it, i) => `
            <div class="mrow" data-i="${i}">
              <code>${esc(it[0])}</code>
              <span class="mrow-sep">${IC.arrowR}</span>
              <select aria-label="Tipo de ${esc(it[0])}">
                <option value="">selecione...</option>
                ${ops.map(o => `<option>${o}</option>`).join('')}
              </select>
              <i></i>
            </div>`).join('')}
        </div>
        <div class="ex-actions"><button class="btn verify" data-s="chk">${IC.check} Verificar</button></div>
      </section>`;

    bindDicas(R.root, ex, R.m, null);

    $('[data-s=chk]', body).onclick = () => {
      p.tent++;
      save();
      let ok = true;
      $$('.mrow', body).forEach((r, i) => {
        const v = $('select', r).value, c = v === ex.itens[i][1];
        ok = ok && c;
        r.classList.toggle('right', c);
        r.classList.toggle('wrong', !c);
        $('i', r).innerHTML = c ? IC.check : IC.x;
      });
      if (ok) {
        concluir(ex);
        marcaOk(R);
        fb(R, `<div class="fb-row"><div><b>${IC.check} Tudo certo!</b> ${ex.expl}</div>${nextBtnHtml(R)}</div>`, 'ok');
      } else {
        erro('Associação: ' + ALL[ex.id].mod.titulo);
        fb(R, `<b>${IC.err} Revise os itens destacados em vermelho.</b>`, 'bad');
      }
    };
  }

  /* ------------------------------------------------------------- Tela 4: Laboratório */
  function viewLab() {
    const exemplos = [
      ['Olá, mundo', W('escreva("Olá, mundo!")')],
      ['Ler nome', W('cadeia nome\n\nescreva("Digite seu nome: ")\nleia(nome)\nescreva("Olá, ", nome)')],
      ['SE / SENÃO', W('inteiro idade\n\nescreva("Idade: ")\nleia(idade)\n\nse (idade >= 18)\n{\n    escreva("Maior de idade")\n}\nsenao\n{\n    escreva("Menor de idade")\n}')],
      ['ESCOLHA', W('inteiro opcao\n\nescreva("1 - Iniciar\\n2 - Sair\\nOpção: ")\nleia(opcao)\n\nescolha (opcao)\n{\n    caso 1:\n        escreva("Iniciando...")\n        pare\n    caso 2:\n        escreva("Saindo...")\n        pare\n    caso contrario:\n        escreva("Inválida")\n}')]
    ];

    setView(`
      <div class="lab-top">
        <h1>Laboratório</h1>
        <div class="lab-ex">
          <span>Modelos:</span>
          ${exemplos.map((e, i) => `<button class="btn ghost sm" data-ex="${i}">${esc(e[0])}</button>`).join('')}
        </div>
      </div>
      <div data-s="body"></div>`, () => {
      let t;
      const ide = new IDE($('[data-s=body]', main), {
        starter: S.lab != null ? S.lab : W('escreva("Olá, mundo!")'),
        onChange: v => { clearTimeout(t); t = setTimeout(() => { S.lab = v; save(); }, 400); }
      });
      $$('[data-ex]', main).forEach(b => (b.onclick = () => ide.ed.setValue(exemplos[+b.dataset.ex][1])));
      cleanup = () => { ide.parar(); clearTimeout(t); };
    });
  }

  /* ------------------------------------------------------------- Tela 5: Progresso do Aluno */
  function relatorioAluno() {
    const p = {};
    Object.keys(S.prog).forEach(id => {
      const x = S.prog[id];
      if (x.tent || x.done) p[id] = [x.done ? 1 : 0, x.tent, x.dicas || 0];
    });
    return 'PTR1-' + enc({
      a: S.aluno.nome || 'Aluno',
      t: S.aluno.turma ? S.aluno.turma.codigo : '',
      ts: Date.now(),
      p,
      e: S.erros
    });
  }

  function viewPainel() {
    const t = totais();
    setView(`
      <h1 class="page-t">Meu Progresso</h1>
      <div class="kpis">
        <div class="card"><b>${t.d} / ${t.t}</b><small>Exercícios concluídos</small></div>
        <div class="card"><b>${t.p}%</b><small>Progresso total</small></div>
        <div class="card"><b>${t.ap}%</b><small>Precisão</small></div>
      </div>

      <div class="two">
        <section class="card">
          <h3>Meus dados</h3>
          <label class="fld">Nome<input id="inNome" value="${esc(S.aluno.nome)}" placeholder="Seu nome"></label>
          <div class="row">
            <button class="btn primary sm" id="btnSalvarNome">Salvar</button>
            <button class="btn danger sm" id="btnReset">Zerar progresso</button>
          </div>
        </section>

        <section class="card">
          <h3>Turma e Entrega</h3>
          ${S.aluno.turma ? `<p class="small">Turma: <b>${esc(S.aluno.turma.nome)}</b></p>` : ''}
          <label class="fld">Código da turma<input id="inCodigo" placeholder="PTA1-..."></label>
          <div class="row">
            <button class="btn ghost sm" id="btnEntrar">Entrar</button>
            <button class="btn primary sm" id="btnRel">Gerar relatório para o Professor</button>
          </div>
        </section>
      </div>`, () => {
      $('#btnSalvarNome').onclick = () => {
        S.aluno.nome = $('#inNome').value.trim();
        save();
        toast('Salvo.', 'ok');
      };
      $('#btnReset').onclick = () => {
        if (confirm('Apagar todo o progresso neste navegador?')) {
          S.prog = {}; S.erros = {}; S.ultimo = null; save(); renderTop(); viewPainel();
        }
      };
      $('#btnEntrar').onclick = () => entrarTurma($('#inCodigo').value);
      $('#btnRel').onclick = () => {
        const c = relatorioAluno();
        modal(`
          <h3>Relatório para o Professor</h3>
          <textarea readonly rows="4" id="relTxt">${c}</textarea>
          <div class="row">
            <button class="btn primary sm" id="cp">Copiar código</button>
            <button class="btn ghost sm" id="dl">Baixar .txt</button>
            <button class="btn ghost sm" data-close>Fechar</button>
          </div>`, w => {
          $('#cp', w).onclick = () => {
            $('#relTxt', w).select();
            (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.resolve(document.execCommand('copy')))
              .then(() => toast('Copiado!', 'ok'));
          };
          $('#dl', w).onclick = () => baixar(`relatorio-${(S.aluno.nome || 'aluno').replace(/\W+/g, '_')}.txt`, c, 'text/plain');
        });
      };
    });
  }

  function entrarTurma(cod) {
    try {
      cod = cod.trim();
      if (!cod.startsWith('PTA1-')) throw 0;
      const d = dec(cod.slice(5));
      if (!d.n || !Array.isArray(d.e)) throw 0;
      S.aluno.turma = { codigo: cod, nome: d.n, ids: d.e.filter(id => ALL[id]) };
      save();
      toast(`Turma "${d.n}" vinculada.`, 'ok');
      go('#/');
    } catch (e) {
      toast('Código inválido.', 'warn');
    }
  }

  function baixar(nome, texto, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo + ';charset=utf-8' }));
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ------------------------------------------------------------- Tela 6: Professor */
  let profTab = 'mod', profAberto = false;

  function viewProf() {
    if (!S.prof.pin) {
      setView(`
        <section class="card narrow">
          <h2>Área do Professor</h2>
          <p class="small">Crie um PIN para proteger gabaritos e controles.</p>
          <label class="fld">Novo PIN<input id="pin1" type="password" inputmode="numeric" placeholder="Mínimo 4 dígitos"></label>
          <button class="btn primary" id="pinOk">Criar PIN</button>
        </section>`, () => {
        $('#pinOk').onclick = () => {
          const v = $('#pin1').value;
          if (v.length < 4) return toast('Mínimo 4 caracteres.', 'warn');
          S.prof.pin = hash('pt' + v);
          save();
          profAberto = true;
          viewProf();
        };
      });
      return;
    }
    if (!profAberto) {
      setView(`
        <section class="card narrow">
          <h2>Área do Professor</h2>
          <label class="fld">PIN<input id="pin1" type="password" placeholder="Digite o PIN"></label>
          <button class="btn primary" id="pinOk">Entrar</button>
        </section>`, () => {
        const f = () => {
          if (hash('pt' + $('#pin1').value) === S.prof.pin) { profAberto = true; viewProf(); }
          else toast('PIN incorreto.', 'warn');
        };
        $('#pinOk').onclick = f;
        $('#pin1').addEventListener('keydown', e => e.key === 'Enter' && f());
      });
      return;
    }

    const tabs = [['mod', 'Gabaritos'], ['ativ', 'Atividades'], ['rel', 'Relatórios']];
    setView(`
      <div class="prof-top">
        <h1 class="page-t">Professor</h1>
        <label class="chk">
          <input type="checkbox" id="cfgProfTodos" ${S.cfg.todos ? 'checked' : ''}>
          Liberar todos os exercícios neste navegador (modo aula)
        </label>
      </div>
      <div class="ptabs">
        ${tabs.map(t => `<button class="${profTab === t[0] ? 'on' : ''}" data-pt="${t[0]}">${t[1]}</button>`).join('')}
        <span class="sp"></span>
        <button class="btn ghost sm" id="sair">Sair</button>
      </div>
      <div id="ptab"></div>`, () => {
      $('#cfgProfTodos').onchange = e => {
        S.cfg.todos = e.target.checked;
        save();
        toast(S.cfg.todos ? 'Exercícios liberados neste navegador.' : 'Bloqueio sequencial ativado.', 'ok');
      };
      $$('[data-pt]', main).forEach(b => (b.onclick = () => { profTab = b.dataset.pt; viewProf(); }));
      $('#sair').onclick = () => { profAberto = false; viewProf(); };
      ({ mod: profMod, ativ: profAtiv, rel: profRel })[profTab]($('#ptab'));
    });
  }

  function profMod(el) {
    el.innerHTML = M.map(m => `
      <details class="card pm">
        <summary><b>${esc(m.icone)} — ${esc(m.titulo)}</b> <small>(${m.ex.length})</small></summary>
        ${m.ex.map((e, i) => `
          <details class="pe">
            <summary>Questão ${e.num} (${esc(m.icone)}.${i + 1}) — ${esc(e.titulo)}</summary>
            <div class="pe-b">
              ${e.enunciado ? `<div>${e.enunciado}</div>` : e.pergunta ? `<div>${typeof e.pergunta === 'string' ? e.pergunta : ''}</div>` : ''}
              ${e.opcoes ? `<p><b>Resposta:</b> ${esc(e.opcoes[e.resp].replace(/<[^>]+>/g, ''))}</p>` : ''}
              ${e.sol ? `<pre class="code">${Hl.html(e.sol)}</pre>` : ''}
            </div>
          </details>`).join('')}
      </details>`).join('');
  }

  function profAtiv(el) {
    el.innerHTML = `
      <section class="card">
        <h3>Nova atividade</h3>
        <label class="fld">Nome<input id="atNome" placeholder="Ex.: Turma A - Aula 1"></label>
        <div class="pick">
          ${M.map(m => `
            <details>
              <summary><label><input type="checkbox" data-all="${m.id}"> ${esc(m.titulo)}</label></summary>
              <div class="pick-ex">
                ${m.ex.map((e, i) => `<label><input type="checkbox" data-ex="${e.id}" data-m="${m.id}"> Q${e.num} (${i + 1}). ${esc(e.titulo)}</label>`).join('')}
              </div>
            </details>`).join('')}
        </div>
        <button class="btn primary sm" id="atCriar">Gerar código</button>
      </section>
      <div id="atLista"></div>`;

    $$('[data-all]', el).forEach(c => (c.onchange = () => $$(`[data-m="${c.dataset.all}"]`, el).forEach(x => (x.checked = c.checked))));
    const lista = () => {
      $('#atLista', el).innerHTML = S.prof.atividades.map((a, i) => `
        <div class="card">
          <b>${esc(a.nome)}</b> <small>(${a.ids.length} exercícios)</small>
          <textarea readonly rows="2">${a.codigo}</textarea>
          <div class="row">
            <button class="btn primary sm" data-cp="${i}">Copiar</button>
            <button class="btn danger sm" data-del="${i}">Excluir</button>
          </div>
        </div>`).join('');
      $$('[data-cp]', el).forEach(b => (b.onclick = () => {
        const t = S.prof.atividades[+b.dataset.cp].codigo;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.resolve()).then(() => toast('Copiado!', 'ok'));
      }));
      $$('[data-del]', el).forEach(b => (b.onclick = () => { S.prof.atividades.splice(+b.dataset.del, 1); save(); lista(); }));
    };
    lista();
    $('#atCriar', el).onclick = () => {
      const nome = $('#atNome', el).value.trim(), ids = $$('[data-ex]:checked', el).map(x => x.dataset.ex);
      if (!nome || !ids.length) return toast('Informe o nome e marque os exercícios.', 'warn');
      const codigo = 'PTA1-' + enc({ n: nome, e: ids, k: Math.random().toString(36).slice(2, 7) });
      S.prof.atividades.unshift({ nome, ids, codigo, criada: Date.now() });
      save(); lista(); toast('Criada!', 'ok');
    };
  }

  function profRel(el) {
    const rel = Object.values(S.prof.relatorios);
    el.innerHTML = `
      <section class="card">
        <h3>Importar relatórios (PTR1-...)</h3>
        <textarea id="relIn" rows="3" placeholder="Cole códigos PTR1-..."></textarea>
        <div class="row">
          <button class="btn primary sm" id="relAdd">Importar</button>
          <label class="btn ghost sm">Arquivos .txt<input type="file" id="relFile" accept=".txt,.json" multiple hidden></label>
          ${rel.length ? '<button class="btn ghost sm" id="relCsv">Exportar CSV</button><button class="btn danger sm" id="relClr">Limpar</button>' : ''}
        </div>
      </section>
      <div id="relOut"></div>`;

    const importa = txt => {
      let n = 0;
      txt.split(/\s+/).filter(x => x.startsWith('PTR1-')).forEach(l => {
        try { const d = dec(l.slice(5)); S.prof.relatorios[(d.t || '') + '|' + d.a] = d; n++; } catch (e) { }
      });
      save();
      toast(n ? `${n} importado(s).` : 'Nenhum código válido.', n ? 'ok' : 'warn');
      viewProf();
    };
    $('#relAdd', el).onclick = () => importa($('#relIn', el).value);
    $('#relFile', el).onchange = async e => { let all = ''; for (const f of e.target.files) all += (await f.text()) + '\n'; importa(all); };
    if (!rel.length) return;

    const dados = rel.map(r => {
      const ps = Object.entries(r.p), done = ps.filter(([, v]) => v[0]).length, tent = ps.reduce((a, [, v]) => a + v[1], 0);
      return { a: r.a, t: r.t, done, tent, ap: tent ? Math.min(100, Math.round(100 * done / tent)) : 0 };
    }).sort((a, b) => a.ap - b.ap);

    $('#relOut', el).innerHTML = `
      <section class="card">
        <table class="tbl">
          <thead><tr><th>Aluno</th><th>Concluídos</th><th>Tentativas</th><th>Precisão</th></tr></thead>
          <tbody>${dados.map(d => `<tr><td><b>${esc(d.a)}</b></td><td>${d.done}</td><td>${d.tent}</td><td>${d.ap}%</td></tr>`).join('')}</tbody>
        </table>
      </section>`;

    $('#relCsv', el).onclick = () => {
      const h = ['Aluno', 'Concluidos', 'Tentativas', 'Precisao(%)'];
      const linhas = dados.map(d => [d.a, d.done, d.tent, d.ap]);
      const csv = '\ufeff' + [h, ...linhas].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
      baixar('relatorio-turma.csv', csv, 'text/csv');
    };
    $('#relClr', el).onclick = () => { if (confirm('Limpar relatórios?')) { S.prof.relatorios = {}; save(); viewProf(); } };
  }

  /* ------------------------------------------------------------- widgets */
  const WIDGETS = {
    anatomia(el) {
      const P = {
        1: ['programa', 'Marca o início do programa.'],
        2: ['{ } do programa', 'Envolvem todo o programa.'],
        3: ['funcao inicio()', 'Ponto onde a execução começa.'],
        4: ['{ } de inicio()', 'Onde ficam seus comandos.'],
        5: ['Variáveis', 'Declaradas no começo da função.'],
        6: ['Comandos', 'Instruções executadas em ordem.']
      };
      const L = [[1, 'programa'], [2, '{'], [3, '    funcao inicio()'], [4, '    {'], [5, '        // VARIÁVEIS'], [6, '        // COMANDOS'], [4, '    }'], [2, '}']];
      el.innerHTML = `<div class="anat"><div class="anat-code code">${L.map(([p, t]) => `<div class="al ${p ? 'part c' + p : ''}" data-p="${p}">${Hl.render(t, {}).replace(/^<div class="l">|<\/div>$/g, '')}</div>`).join('')}</div><div class="anat-info"><div class="chips">${Object.entries(P).map(([k, v]) => `<button type="button" class="chip" data-p="${k}">${v[0]}</button>`).join('')}</div><div class="anat-exp"></div></div></div>`;
      const sel = k => {
        $$('.al', el).forEach(a => a.classList.toggle('dim', a.dataset.p !== String(k)));
        $$('.chip', el).forEach(c => c.classList.toggle('on', c.dataset.p === String(k)));
        $('.anat-exp', el).innerHTML = `<b>${P[k][0]}:</b> ${P[k][1]}`;
      };
      $$('[data-p]', el).forEach(a => a.addEventListener('click', () => sel(a.dataset.p)));
      sel(1);
    },
    mem(el) {
      const regras = {
        inteiro: [v => /^-?\d+$/.test(v), 'número inteiro (ex: 17)'],
        real: [v => /^-?\d+(\.\d+)?$/.test(v), 'decimal com ponto (ex: 8.5)'],
        cadeia: [v => /^".*"$/.test(v), 'texto com aspas duplas (ex: "Ana")'],
        caractere: [v => /^'.'$/.test(v), "1 letra com aspas simples (ex: 'A')"],
        logico: [v => v === 'verdadeiro' || v === 'falso', 'verdadeiro ou falso']
      };
      el.innerHTML = `<div class="memw"><div class="row"><select data-k="t">${Object.keys(regras).map(t => `<option>${t}</option>`).join('')}</select><input data-k="n" value="idade" maxlength="12"><input data-k="v" value="17"></div><div class="memw-out"></div></div>`;
      const q = k => $(`[data-k=${k}]`, el);
      const draw = () => {
        const t = q('t').value, n = q('n').value.trim() || 'x', v = q('v').value.trim(), [chk, dica] = regras[t], ok = chk(v);
        $('.memw-out', el).innerHTML = `<p class="${ok ? 'okt' : 'badt'}">${ok ? `Correto: <code>${t} ${esc(n)} = ${esc(v)}</code> é válido.` : `Inválido: <code>${t}</code> exige ${dica}.`}</p>`;
      };
      $$('select,input', el).forEach(x => x.addEventListener('input', draw));
      draw();
    },
    assign(el) {
      el.innerHTML = `<div class="asg"><div class="row"><code>idade =</code> <input value="18" maxlength="4" style="width:70px"> <button type="button" class="btn primary sm">Guardar</button> <span class="mem-chip"><b>idade</b> = <span class="val">0</span></span></div></div>`;
      const inp = $('input', el), val = $('.val', el);
      $('button', el).onclick = () => {
        const v = inp.value.trim();
        if (!/^-?\d+$/.test(v)) return toast('Digite um inteiro.', 'warn');
        val.textContent = v;
      };
    }
  };

  /* ------------------------------------------------------------- rotas */
  function route() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    const r = h[0] || 'home';
    $$('.topnav a').forEach(a => a.classList.remove('on'));
    const nav = { home: 'navHome', m: 'navHome', painel: 'navPainel', lab: 'navLab', prof: 'navProf' }[r];
    if (nav && $('#' + nav)) $('#' + nav).classList.add('on');

    if (r === 'm') {
      const m = M.find(x => x.id === h[1]);
      if (!m) return go('#/');
      if (!liberado(m)) {
        toast('Conclua a missão anterior primeiro.', 'warn');
        return go('#/');
      }
      const n = +h[2] || null;
      if (n) viewEx(m, n);
      else viewLicao(m);
      return;
    }

    const fn = { home: viewHome, lab: viewLab, painel: viewPainel, prof: viewProf }[r];
    if (fn) fn(); else go('#/');
  }

  /* ------------------------------------------------------------- inicialização */
  function aplicaTema() {
    document.documentElement.dataset.tema = S.cfg.tema || 'light';
    renderTop();
  }
  $('#btnTema').onclick = () => {
    S.cfg.tema = S.cfg.tema === 'dark' ? 'light' : 'dark';
    save();
    aplicaTema();
  };
  window.addEventListener('hashchange', () => { route(); renderTop(); });
  aplicaTema();

  if (!S.aluno.nome) {
    modal(`
      <h3>Qual é o seu nome?</h3>
      <label class="fld"><input id="nm" placeholder="Digite seu nome" autofocus></label>
      <button class="btn primary" id="nmOk" style="width:100%">Começar</button>`, (w, close) => {
      const f = () => {
        S.aluno.nome = $('#nm', w).value.trim() || 'Aluno';
        save();
        close();
        route();
      };
      $('#nmOk', w).onclick = f;
      $('#nm', w).addEventListener('keydown', e => e.key === 'Enter' && f());
    });
  }
  route();
})();
