/* Portugol Trainer — Avaliador: executa o código do aluno com entradas de teste e confere as regras de cada exercício. */
(function (G) {
  'use strict';
  async function executar(ast, entradas) {
    let out = '', i = 0;
    const io = {
      write: s => { out += s; },
      read: async () => { if (i >= entradas.length) throw new Error('__sem_entrada'); return String(entradas[i++]); }
    };
    try {
      const r = await G.Portugol.run(ast, io, {});
      if (r.error) return { out, vars: r.vars, erro: `${r.error.titulo}. ${r.error.explicacao}` };
      return { out, vars: r.vars };
    } catch (e) {
      if (e.message === '__sem_entrada') return { out, vars: [], erro: 'Seu programa tentou ler mais dados do que o teste forneceu. Confira se há leia() sobrando.' };
      throw e;
    }
  }
  function criarCtx(src, comp) {
    const cache = new Map();
    const tok = comp.tokens;
    let firstRun = null;
    return {
      src, tokens: tok, stats: comp.stats,
      getSample: () => firstRun,
      has: n => tok.some(t => (t.t === 'kw' || t.t === 'id') && t.v === n),
      decls: tipo => comp.stats.decls.filter(d => d.type === tipo).length,
      run: async inputs => {
        const k = JSON.stringify(inputs);
        if (!cache.has(k)) {
          const res = await executar(comp.ast, inputs);
          cache.set(k, res);
          if (!firstRun) firstRun = { inputs, ...res };
        }
        return cache.get(k);
      }
    };
  }
  async function avaliar(rules, src) {
    const comp = G.Portugol.compile(src);
    if (!comp.ok) return { compilou: false, comp, results: [], pass: false, sample: null };
    const ctx = criarCtx(src, comp);
    const results = []; let pass = true;
    for (const r of rules) {
      if (!pass) { results.push({ label: r.label, ok: null }); continue; }
      let res = await r.test(ctx);
      let ok, msg;
      if (typeof res === 'object' && res !== null) { ok = !!res.ok; msg = res.msg; } else ok = !!res;
      if (!ok) { pass = false; msg = msg || r.fail || 'Ainda não está certo.'; }
      results.push({ label: r.label, ok, msg });
    }
    let sample = ctx.getSample();
    if (!sample && comp.stats.leia === 0) {
      const res = await executar(comp.ast, []);
      sample = { inputs: [], ...res };
    }
    return { compilou: true, comp, results, pass, sample };
  }
  G.Grader = { avaliar, executar };
})(typeof globalThis !== 'undefined' ? globalThis : window);
