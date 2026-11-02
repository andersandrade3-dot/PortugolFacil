/* ==========================================================================
   Portugol Fácil — Editor de código leve, rápido e sincronizado (1:1)
   Numeração de linhas, destaque de sintaxe, indentação automática e erros.
   ========================================================================== */
(function (G) {
  'use strict';
  const ESTRUTURA = new Set(['programa', 'funcao', 'inicio', 'inclua', 'biblioteca']);
  const TIPO = new Set(['inteiro', 'real', 'cadeia', 'caractere', 'logico', 'vazio', 'const']);
  const CMD = new Set(['escreva', 'leia']);
  const CTRL = new Set(['se', 'senao', 'escolha', 'caso', 'contrario', 'pare', 'e', 'ou', 'nao', 'para', 'enquanto', 'faca', 'retorne']);
  const BOOL = new Set(['verdadeiro', 'falso']);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function tokenizeLine(line, st, ln, brackets) {
    const out = [];
    let i = 0;
    const n = line.length;
    while (i < n) {
      if (st.block) {
        const k = line.indexOf('*/', i);
        if (k < 0) { out.push({ c: 'cmt', t: line.slice(i) }); i = n; }
        else { out.push({ c: 'cmt', t: line.slice(i, k + 2) }); i = k + 2; st.block = false; }
        continue;
      }
      const ch = line[i];
      if (ch === '/' && line[i + 1] === '/') { out.push({ c: 'cmt', t: line.slice(i) }); break; }
      if (ch === '/' && line[i + 1] === '*') { st.block = true; out.push({ c: 'cmt', t: '/*' }); i += 2; continue; }
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < n && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
        const closed = j < n;
        out.push({ c: (ch === '"' ? 'st' : 'chr') + (closed ? '' : ' bad'), t: line.slice(i, closed ? j + 1 : n) });
        i = closed ? j + 1 : n;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        let j = i;
        while (j < n && /[0-9.]/.test(line[j])) j++;
        out.push({ c: 'nu', t: line.slice(i, j) });
        i = j;
        continue;
      }
      if (/[A-Za-zÀ-ÿ_]/.test(ch)) {
        let j = i;
        while (j < n && /[A-Za-zÀ-ÿ_0-9]/.test(line[j])) j++;
        const w = line.slice(i, j);
        const c = ESTRUTURA.has(w) ? 'k-st' : TIPO.has(w) ? 'k-ty' : CMD.has(w) ? 'k-cm' : CTRL.has(w) ? 'k-ct' : BOOL.has(w) ? 'nu' : 'id';
        out.push({ c, t: w });
        i = j;
        continue;
      }
      if ('{}()'.includes(ch)) {
        const b = { line: ln, col: i, ch, unm: false, mt: false };
        brackets.push(b);
        out.push({ c: 'br', t: ch, b });
        i++;
        continue;
      }
      if (/\s/.test(ch)) {
        let j = i;
        while (j < n && /\s/.test(line[j])) j++;
        out.push({ c: '', t: line.slice(i, j) });
        i = j;
        continue;
      }
      out.push({ c: 'op', t: ch });
      i++;
    }
    return out;
  }

  function render(src, opts) {
    opts = opts || {};
    const normSrc = String(src || '').replace(/\r\n/g, '\n');
    const lines = normSrc.split('\n'), st = { block: false }, brackets = [];
    const toks = lines.map((l, i) => tokenizeLine(l, st, i, brackets));
    for (const [open, close] of [['{', '}'], ['(', ')']]) {
      const stack = [];
      for (const b of brackets) {
        if (b.ch === open) stack.push(b);
        else if (b.ch === close) {
          if (stack.length) { const o = stack.pop(); o.pair = b; b.pair = o; }
          else b.unm = true;
        }
      }
      stack.forEach(b => (b.unm = true));
    }
    let activeLine = -1;
    if (opts.caret != null) {
      const before = normSrc.slice(0, opts.caret).split('\n');
      const cl = before.length - 1, cc = before[before.length - 1].length;
      if (opts.focused) activeLine = cl;
      const alvo = brackets.find(b => b.line === cl && b.col === cc - 1) || brackets.find(b => b.line === cl && b.col === cc);
      if (alvo) { alvo.mt = true; if (alvo.pair) alvo.pair.mt = true; }
    }
    return lines.map((l, i) => {
      const inner = toks[i].map(t => {
        if (t.b) return `<span class="br${t.b.unm ? ' unm' : ''}${t.b.mt ? ' mt' : ''}">${esc(t.t)}</span>`;
        return t.c ? `<span class="${t.c}">${esc(t.t)}</span>` : esc(t.t);
      }).join('');
      const e = opts.errors && opts.errors.get(i + 1);
      const act = i === activeLine && !e;
      return `<div class="l${e ? ' err' : ''}${opts.warns && opts.warns.has(i + 1) ? ' warn' : ''}${act ? ' act' : ''}">${inner || ' '}</div>`;
    }).join('');
  }
  const htmlEstatico = code => render(String(code || '').replace(/\n$/, ''), {});

  function formatarIndentacao(src) {
    const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    let depth = 0, extra = 0, pend = false;
    const pilha = [];
    const limpa = t => t.replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'/g, '""').replace(/\/\/.*$/, '');
    return lines.map(raw => {
      const t = raw.trim();
      if (!t) return '';
      const c = limpa(t);
      let i = 0;
      while (c[i] === '}') {
        const top = pilha[pilha.length - 1];
        if (top && depth === top.d && top.open) { extra--; top.open = false; }
        depth--;
        const tp = pilha[pilha.length - 1];
        if (tp && depth < tp.d) pilha.pop();
        i++;
      }
      const top = pilha[pilha.length - 1];
      if (/^caso\b/.test(c) && top && depth === top.d) { if (top.open) extra--; top.open = false; }
      const ind = Math.max(0, depth + extra) * 4;
      if (/^caso\b/.test(c) && top && depth === top.d) { top.open = true; extra++; }
      if (/^escolha\b/.test(c)) pend = true;
      for (const ch of c.slice(i)) {
        if (ch === '{') { depth++; if (pend) { pilha.push({ d: depth, open: false }); pend = false; } }
        else if (ch === '}') {
          const tp = pilha[pilha.length - 1];
          if (tp && depth === tp.d && tp.open) { extra--; tp.open = false; }
          depth--;
          const t2 = pilha[pilha.length - 1];
          if (t2 && depth < t2.d) pilha.pop();
        }
      }
      return ' '.repeat(ind) + t;
    }).join('\n');
  }

  class CodeEditor {
    constructor(root, opts) {
      opts = opts || {};
      this.root = root;
      this.onChange = opts.onChange || (() => {});
      this.errors = new Map();
      this.warns = new Set();

      root.classList.add('cm');
      root.innerHTML = `
        <div class="cm-gutter" aria-hidden="true"><div class="cm-nums"></div></div>
        <div class="cm-body">
          <div class="cm-hl" aria-hidden="true"><div class="cm-hl-in"></div></div>
          <textarea class="cm-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" placeholder="// Digite seu comando aqui..." aria-label="Editor de código Portugol"></textarea>
        </div>`;

      this.ta = root.querySelector('.cm-ta');
      this.hl = root.querySelector('.cm-hl-in');
      this.nums = root.querySelector('.cm-nums');
      this.ta.value = String(opts.value || '').replace(/\r\n/g, '\n');

      root.addEventListener('mousedown', e => {
        if (e.target !== this.ta) {
          e.preventDefault();
          this.ta.focus();
        }
      });

      this.ta.addEventListener('input', () => {
        this.update();
        this.onChange(this.ta.value);
      });
      this.ta.addEventListener('compositionend', () => {
        this.update();
        this.onChange(this.ta.value);
      });
      this.ta.addEventListener('scroll', () => this.sync());
      this.ta.addEventListener('keydown', e => this.key(e));
      ['keyup', 'click', 'focus', 'blur', 'select'].forEach(ev => this.ta.addEventListener(ev, () => this.update()));
      this.update();
    }

    sync() {
      this.hl.style.transform = `translate(${-this.ta.scrollLeft}px, ${-this.ta.scrollTop}px)`;
      this.nums.style.transform = `translateY(${-this.ta.scrollTop}px)`;
    }

    update() {
      const v = this.ta.value.replace(/\r\n/g, '\n');
      if (v !== this.ta.value) {
        const s = this.ta.selectionStart, e = this.ta.selectionEnd;
        this.ta.value = v;
        this.ta.setSelectionRange(s, e);
      }
      const focused = typeof document !== 'undefined' && document.activeElement === this.ta;
      const caret = this.ta.selectionStart === this.ta.selectionEnd ? this.ta.selectionStart : null;
      const activeLine = focused && caret != null ? v.slice(0, caret).split('\n').length : -1;
      this.hl.innerHTML = render(v, { errors: this.errors, warns: this.warns, caret, focused });
      const n = Math.max(1, v.split('\n').length);
      let h = '';
      for (let i = 1; i <= n; i++) {
        const e = this.errors.get(i);
        const cls = e ? 'err' : this.warns.has(i) ? 'warn' : i === activeLine ? 'act' : '';
        h += `<div class="${cls}"${e ? ` title="${esc(e).replace(/"/g, '&quot;')}"` : ''}>${i}</div>`;
      }
      this.nums.innerHTML = h;
      this.sync();
    }

    getValue() { return this.ta.value; }

    setValue(v) {
      this.ta.value = String(v || '').replace(/\r\n/g, '\n');
      this.errors = new Map();
      this.warns = new Set();
      this.update();
      this.onChange(this.ta.value);
    }

    setMarks(errors, warnings) {
      this.errors = new Map();
      (errors || []).forEach(e => { if (!this.errors.has(e.line)) this.errors.set(e.line, e.titulo); });
      this.warns = new Set((warnings || []).map(w => w.line));
      this.update();
    }

    clearMarks() { this.setMarks([], []); }
    focus() { this.ta.focus(); }

    focusSmart() {
      const v = this.ta.value;
      const lines = v.split('\n');
      let targetLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^ {4,}$/.test(lines[i])) { targetLine = i; break; }
        if (/^\s*\/\//.test(lines[i]) && lines[i + 1] !== undefined && /^\s*$/.test(lines[i + 1])) {
          targetLine = i + 1;
          break;
        }
      }
      this.ta.focus();
      if (targetLine >= 0) {
        let pos = 0;
        for (let i = 0; i < targetLine; i++) pos += lines[i].length + 1;
        pos += lines[targetLine].length;
        this.ta.setSelectionRange(pos, pos);
      }
      this.update();
    }

    insert(txt) {
      const ta = this.ta;
      ta.focus();
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText(txt, s, e, 'end');
      this.update();
      this.onChange(ta.value);
    }

    key(e) {
      if (e.isComposing) return;
      const ta = this.ta, v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          const ls = v.lastIndexOf('\n', s - 1) + 1;
          const m = v.slice(ls).match(/^ {1,4}/);
          if (m) { ta.setSelectionRange(ls, ls + m[0].length); this.insert(''); }
        } else {
          this.insert('    ');
        }
      } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const ind = (v.slice(ls, s).match(/^\s*/) || [''])[0];
        const antes = v[s - 1], depois = v[en];
        if (antes === '{' && depois === '}') {
          this.insert('\n' + ind + '    \n' + ind);
          const pos = s + 1 + ind.length + 4;
          ta.setSelectionRange(pos, pos);
          this.update();
        } else {
          this.insert('\n' + ind + (antes === '{' ? '    ' : ''));
        }
      } else if (e.key === '}' && s === en) {
        const ls = v.lastIndexOf('\n', s - 1) + 1, antes = v.slice(ls, s);
        if (/^ {4,}$/.test(antes)) {
          e.preventDefault();
          ta.setSelectionRange(s - 4, s);
          this.insert('}');
        }
      }
    }

    indentar() { this.setValue(formatarIndentacao(this.ta.value)); }
  }

  G.Hl = { render, html: htmlEstatico };
  G.formatarIndentacao = formatarIndentacao;
  G.CodeEditor = CodeEditor;
})(typeof globalThis !== 'undefined' ? globalThis : window);
