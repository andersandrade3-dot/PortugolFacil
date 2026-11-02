// Teste automatizado: gabaritos devem passar, códigos iniciais de correção devem falhar, erros devem ter mensagens.
require('../js/portugol.js'); require('../js/editor.js'); require('../js/content.js'); require('../js/grader.js');
const { M } = Content;
(async () => {
  let falhas = 0, total = 0;
  for (const m of M) for (const e of m.ex) {
    if (e.tipo !== 'code') continue;
    total++;
    const regras = e.etapas ? e.etapas.flatMap(s => s.rules) : e.rules;
    if (!e.sol) { console.log('SEM GABARITO', e.id); falhas++; continue; }
    const r = await Grader.avaliar(regras, e.sol);
    if (!r.compilou) { console.log('GABARITO NÃO COMPILA', e.id, r.comp.errors.map(x => x.line + ':' + x.titulo)); falhas++; continue; }
    if (!r.pass) { const f = r.results.find(x => x.ok === false); console.log('GABARITO FALHA', e.id, f.label, '=>', f.msg); falhas++; }
    // código inicial não pode passar sem o aluno escrever/corrigir
    if (e.starter !== undefined) {
      const r2 = await Grader.avaliar(regras, e.starter);
      if (r2.pass) { console.log('STARTER JÁ PASSA', e.id); falhas++; }
    }
  }
  // quizzes: índice de resposta válido
  for (const m of M) for (const e of m.ex) if (e.tipo === 'quiz' && !(e.resp >= 0 && e.resp < e.opcoes.length)) { console.log('QUIZ INVÁLIDO', e.id); falhas++; }
  // fix: mostrar erros do starter
  for (const m of M) for (const e of m.ex) if (e.fix) {
    const c = Portugol.compile(e.starter);
    console.log(e.id, c.errors.length, 'erros:', c.errors.map(x => `L${x.line} ${x.code}`).join(', ') || '(compila)');
  }
  // erros intencionais pedidos
  const T = (src) => Portugol.compile(src).errors.map(x => x.code + ':' + x.explicacao.slice(0, 50));
  console.log(T('programa\n{\n    funcao inicio()\n    {\n        escreva("Olá mundo!")\n}'));
  console.log(T('programa\n{\n    funcao inicio\n    {\n        escreva("Olá")\n    }\n}'));
  console.log(T(Content.W('escreva("Olá"')), T(Content.W('escreva Olá')), T(Content.W('leia("nome")')));
  console.log(T(Content.W('idade inteiro')), T(Content.W('inteiro idade = "17"')), T(Content.W('inteiro idade\nidade == 18')));
  console.log('quizzes:', Content.M.find(m => m.id === 'qz').ex.length, 'exercícios:', M.reduce((a, m) => a + m.ex.length, 0));
  console.log(`code exercises: ${total}, falhas: ${falhas}`);
  process.exit(falhas ? 1 : 0);
})();
