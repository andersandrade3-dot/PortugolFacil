/* ==========================================================================
   Portugol Trainer — Interpretador de Portugol (sintaxe do Portugol Studio/WebStudio)
   - Lexer + Parser recursivo + verificação de tipos + executor assíncrono.
   - NÃO usa eval() nem new Function(): o código do aluno é apenas DADOS que
     são lidos e interpretados por este programa. Só os comandos listados
     abaixo existem; qualquer outra coisa gera uma mensagem pedagógica.
   ========================================================================== */
(function (G) {
  'use strict';

  const TIPOS = ['inteiro', 'real', 'cadeia', 'caractere', 'logico'];
  const KW = new Set([...TIPOS, 'programa', 'funcao', 'inicio', 'escreva', 'leia', 'se', 'senao',
    'escolha', 'caso', 'contrario', 'pare', 'verdadeiro', 'falso', 'e', 'ou', 'nao']);
  const NAO_ENSINADOS = new Set(['inclua', 'biblioteca', 'const', 'vazio', 'retorne', 'para', 'enquanto', 'faca']);
  const COMANDOS = ['escreva', 'leia', 'se', 'senao', 'escolha', 'caso', 'pare'];

  const E = (line, code, titulo, explicacao, dica) => ({ line, code, titulo, explicacao, dica: dica || '' });

  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function parecido(word, lista) {
    let best = null, bd = 99;
    for (const w of lista) {
      const d = lev(word.toLowerCase(), w);
      if (d < bd) { bd = d; best = w; }
    }
    return bd <= 2 && best !== word ? best : null;
  }

  /* ------------------------------------------------------------------ LEXER */
  function lex(src) {
    const tokens = [], errors = [];
    let i = 0, line = 1;
    const n = src.length;
    const isL = c => /[A-Za-zÀ-ÿ_]/.test(c);
    const isD = c => c >= '0' && c <= '9';
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        const sl = line; i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        if (i >= n) errors.push(E(sl, 'COMENTARIO_ABERTO', 'Comentário não fechado',
          'Um comentário que começa com /* precisa terminar com */.', 'Feche o comentário com */.'));
        i += 2; continue;
      }
      if (c === '"' || c === "'") {
        const q = c, sl = line;
        let j = i + 1, val = '', closed = false;
        while (j < n) {
          const d = src[j];
          if (d === '\\' && j + 1 < n && src[j + 1] !== '\n') {
            const e = src[j + 1]; val += e === 'n' ? '\n' : e === 't' ? '\t' : e; j += 2; continue;
          }
          if (d === q) { closed = true; break; }
          if (d === '\n') break;
          val += d; j++;
        }
        if (!closed) errors.push(E(sl, 'STRING_ABERTA', 'Aspas não fechadas',
          'Todo texto precisa de aspas no começo e no fim: "assim". Você abriu as aspas, mas esqueceu de fechá-las.',
          'Coloque as aspas de fechamento no final do texto.'));
        const raw = src.slice(i, closed ? j + 1 : j);
        i = closed ? j + 1 : j;
        if (q === '"') tokens.push({ t: 'str', v: val, raw, line: sl });
        else {
          if (closed && val.length !== 1) errors.push(E(sl, 'CHAR_INVALIDO', 'Aspas simples guardam um só caractere',
            "Aspas simples são usadas para UM caractere, como 'A'. Para textos maiores use aspas duplas: \"texto\".",
            'Troque as aspas simples por aspas duplas.'));
          tokens.push({ t: 'chr', v: val, raw, line: sl });
        }
        continue;
      }
      if (isD(c)) {
        let j = i; while (j < n && isD(src[j])) j++;
        let real = false;
        if (src[j] === '.' && isD(src[j + 1] || '')) { real = true; j++; while (j < n && isD(src[j])) j++; }
        tokens.push({ t: 'num', v: Number(src.slice(i, j)), isReal: real, raw: src.slice(i, j), line });
        i = j; continue;
      }
      if (isL(c)) {
        let j = i; while (j < n && (isL(src[j]) || isD(src[j]))) j++;
        const w = src.slice(i, j);
        tokens.push({ t: KW.has(w) ? 'kw' : 'id', v: w, raw: w, line });
        i = j; continue;
      }
      const two = src.substr(i, 2);
      if (['==', '!=', '>=', '<='].includes(two)) { tokens.push({ t: 'op', v: two, raw: two, line }); i += 2; continue; }
      if (two === '&&') { tokens.push({ t: 'kw', v: 'e', raw: '&&', line }); i += 2; continue; }
      if (two === '||') { tokens.push({ t: 'kw', v: 'ou', raw: '||', line }); i += 2; continue; }
      if (c === '!') { tokens.push({ t: 'kw', v: 'nao', raw: '!', line }); i++; continue; }
      if ('+-*/%=<>(){}:,;'.includes(c)) { tokens.push({ t: 'op', v: c, raw: c, line }); i++; continue; }
      errors.push(E(line, 'CARACTERE_INVALIDO', `Símbolo desconhecido: ${c}`,
        `O símbolo "${c}" não faz parte da linguagem Portugol que estamos estudando.`, 'Apague esse símbolo ou confira se não foi digitado sem querer.'));
      i++;
    }
    return { tokens, errors };
  }

  /* ----------------------------------------------------------------- PARSER */
  class Fatal { }

  const numerico = t => t === 'inteiro' || t === 'real';
  const compat = (alvo, orig) => orig === '?' || alvo === orig || (alvo === 'real' && orig === 'inteiro') || (alvo === 'cadeia' && orig === 'caractere');

  function compile(src) {
    const lx = lex(src), toks = lx.tokens, errors = lx.errors.slice(), warnings = [];
    toks.push({ t: 'eof', v: 'fim do código', raw: '', line: src.split('\n').length });
    let p = 0, escolhaDepth = 0;
    const stats = { escreva: 0, leia: 0, se: 0, senao: 0, escolha: 0, caso: 0, atrib: 0, pare: 0, decls: [], ops: new Set() };
    const scopes = [new Map()];
    const globals = [];

    const peek = (k = 0) => toks[Math.min(p + k, toks.length - 1)];
    const next = () => toks[p < toks.length - 1 ? p++ : p];
    const isOp = (v, k = 0) => { const t = peek(k); return t.t === 'op' && t.v === v; };
    const isKw = (v, k = 0) => { const t = peek(k); return t.t === 'kw' && t.v === v; };
    const prevLine = () => (p > 0 ? toks[p - 1].line : 1);
    const nome = t => (t.t === 'eof' ? 'o fim do código' : `"${t.raw}"`);
    function err(line, code, titulo, expl, dica, fatal) {
      errors.push(E(line, code, titulo, expl, dica));
      if (fatal) throw new Fatal();
    }
    function skipLine(line) {
      while (peek().t !== 'eof' && peek().line === line && !isOp('}')) next();
    }
    function lookup(nm) {
      for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(nm)) return scopes[i].get(nm);
      return null;
    }
    function declare(nm, tipo, line) {
      const sc = scopes[scopes.length - 1];
      if (sc.has(nm)) err(line, 'DUPLICADA', `A variável "${nm}" já foi declarada`,
        'Cada variável é criada uma única vez. Para mudar o valor dela depois, use a atribuição (nome = valor).', `Apague esta declaração e use apenas ${nm} = valor.`);
      sc.set(nm, { type: tipo });
      stats.decls.push({ name: nm, type: tipo, line });
    }
    function naoDeclarada(t) {
      err(t.line, 'VAR_NAO_DECLARADA', `A variável "${t.v}" não foi declarada`,
        'Você está tentando utilizar uma variável que ainda não foi criada. Primeiro informe o tipo e o nome dela.',
        `Declare antes de usar, por exemplo: inteiro ${t.v}`);
    }
    function mismatch(line, alvo, orig, nm) {
      const v = nm ? `"${nm}" ` : '';
      let ex, dica;
      if (numerico(alvo) && orig === 'cadeia') {
        ex = `A variável ${v}é do tipo ${alvo}, que guarda números. Mas o valor está entre aspas, então o computador entende como texto.`;
        dica = 'Tire as aspas do valor ou declare a variável como cadeia.';
      } else if (alvo === 'inteiro' && orig === 'real') {
        ex = `A variável ${v}é inteiro e só guarda números sem parte decimal. O valor informado tem casas decimais.`;
        dica = 'Para números como 8.5 use o tipo real.';
      } else if (alvo === 'cadeia' && numerico(orig)) {
        ex = `A variável ${v}é cadeia e guarda textos. Para guardar um texto, coloque-o entre aspas.`;
        dica = 'Coloque o valor entre aspas duplas ou mude o tipo para inteiro/real.';
      } else if (alvo === 'logico') {
        ex = `A variável ${v}é logico e só guarda verdadeiro ou falso (sem aspas).`;
        dica = 'Use verdadeiro ou falso.';
      } else {
        ex = `A variável ${v}é do tipo ${alvo}, mas o valor é do tipo ${orig}. O tipo da variável define o que ela pode guardar.`;
        dica = `Use um valor do tipo ${alvo} ou mude o tipo da variável.`;
      }
      err(line, 'TIPO_INCOMPATIVEL', `Tipo incompatível: ${alvo} recebendo ${orig}`, ex, dica);
    }
    const eatSemi = () => {
      if (isOp(';')) {
        const t = next();
        err(t.line, 'PONTO_VIRGULA', 'Ponto e vírgula não é usado aqui',
          'No Portugol, os comandos não terminam com ponto e vírgula (;). Cada comando fica em sua própria linha.', 'Apague o ponto e vírgula.');
      }
    };

    /* ----- expressões */
    function parseExpr() { return parseOu(); }
    function logicoOk(l, r, op, line) {
      if ((l.type !== 'logico' && l.type !== '?') || (r.type !== 'logico' && r.type !== '?'))
        err(line, 'LOGICO_TIPO', `O operador "${op}" combina condições`,
          `O operador "${op}" só funciona com valores verdadeiro/falso, como (idade > 10) ${op} (idade < 20).`,
          'Escreva cada condição completa dos dois lados.');
    }
    function parseOu() {
      let l = parseE();
      while (isKw('ou')) {
        const t = next(); const r = parseE(); logicoOk(l, r, 'ou', t.line); stats.ops.add('ou');
        l = { k: 'bin', op: 'ou', l, r, type: 'logico', line: t.line };
      }
      return l;
    }
    function parseE() {
      let l = parseIgual();
      while (isKw('e')) {
        const t = next(); const r = parseIgual(); logicoOk(l, r, 'e', t.line); stats.ops.add('e');
        l = { k: 'bin', op: 'e', l, r, type: 'logico', line: t.line };
      }
      return l;
    }
    function parseIgual() {
      let l = parseRel();
      while (isOp('==') || isOp('!=')) {
        const t = next(); const r = parseRel(); stats.ops.add(t.v);
        const a = l.type, b = r.type;
        const ok = a === '?' || b === '?' || (numerico(a) && numerico(b)) || a === b ||
          ((a === 'cadeia' || a === 'caractere') && (b === 'cadeia' || b === 'caractere'));
        if (!ok) err(t.line, 'TIPO_COMPARACAO', `Comparação entre ${a} e ${b}`,
          `Você está comparando valores de tipos diferentes (${a} com ${b}). Só é possível comparar valores do mesmo tipo.`,
          'Confira se a variável e o valor comparado têm o mesmo tipo (texto com aspas, número sem aspas).');
        l = { k: 'bin', op: t.v, l, r, type: 'logico', line: t.line };
      }
      return l;
    }
    function parseRel() {
      let l = parseSoma();
      while (isOp('<') || isOp('>') || isOp('<=') || isOp('>=')) {
        const t = next(); const r = parseSoma(); stats.ops.add(t.v);
        const a = l.type, b = r.type;
        const ok = a === '?' || b === '?' || (numerico(a) && numerico(b)) || (a === 'caractere' && b === 'caractere');
        if (!ok) err(t.line, 'TIPO_COMPARACAO', `Não dá para comparar ${a} com ${b} usando ${t.v}`,
          `Os símbolos > < >= <= comparam tamanhos de números. Aqui os tipos são ${a} e ${b}.`, 'Compare números com números.');
        l = { k: 'bin', op: t.v, l, r, type: 'logico', line: t.line };
      }
      return l;
    }
    function parseSoma() {
      let l = parseMult();
      while (isOp('+') || isOp('-')) {
        const t = next(); const r = parseMult(); stats.ops.add(t.v);
        let tipo;
        const a = l.type, b = r.type;
        if (a === '?' || b === '?') tipo = '?';
        else if (t.v === '+' && (a === 'cadeia' || b === 'cadeia' || (a === 'caractere' && b === 'caractere'))) tipo = 'cadeia';
        else if (numerico(a) && numerico(b)) tipo = a === 'real' || b === 'real' ? 'real' : 'inteiro';
        else { err(t.line, 'TIPO_OPERACAO', `Operação ${t.v} com tipo inválido`,
          `Não é possível usar "${t.v}" entre ${a} e ${b}. Operações matemáticas funcionam com números (inteiro e real).`, 'Verifique os tipos das variáveis usadas na conta.'); tipo = '?'; }
        l = { k: 'bin', op: t.v, l, r, type: tipo, line: t.line };
      }
      return l;
    }
    function parseMult() {
      let l = parseUnario();
      while (isOp('*') || isOp('/') || isOp('%')) {
        const t = next(); const r = parseUnario(); stats.ops.add(t.v);
        let tipo;
        const a = l.type, b = r.type;
        if (a === '?' || b === '?') tipo = '?';
        else if (numerico(a) && numerico(b)) tipo = (a === 'inteiro' && b === 'inteiro') || (t.v === '*' && a !== 'real' && b !== 'real') ? 'inteiro' : 'real';
        else { err(t.line, 'TIPO_OPERACAO', `Operação ${t.v} com tipo inválido`,
          `Não é possível usar "${t.v}" entre ${a} e ${b}. Operações matemáticas funcionam com números.`, 'Verifique os tipos das variáveis usadas na conta.'); tipo = '?'; }
        if (t.v === '%' && tipo === 'real') tipo = 'real';
        l = { k: 'bin', op: t.v, l, r, type: tipo, line: t.line };
      }
      return l;
    }
    function parseUnario() {
      if (isKw('nao')) {
        const t = next(); const e = parseUnario(); stats.ops.add('nao');
        if (e.type !== 'logico' && e.type !== '?') err(t.line, 'LOGICO_TIPO', 'O operador "nao" inverte condições',
          'O "nao" só funciona com valores verdadeiro/falso, por exemplo: nao (idade > 18).', 'Coloque uma condição completa depois do nao.');
        return { k: 'un', op: 'nao', e, type: 'logico', line: t.line };
      }
      if (isOp('-')) {
        const t = next(); const e = parseUnario();
        if (!numerico(e.type) && e.type !== '?') err(t.line, 'TIPO_OPERACAO', 'Sinal de menos com tipo inválido', 'O sinal de menos só vale para números.', '');
        return { k: 'un', op: '-', e, type: e.type, line: t.line };
      }
      return parsePrimario();
    }
    function parsePrimario() {
      const t = peek();
      if (t.t === 'num') { next(); return { k: 'lit', t: t.isReal ? 'real' : 'inteiro', type: t.isReal ? 'real' : 'inteiro', v: t.v, line: t.line }; }
      if (t.t === 'str') { next(); return { k: 'lit', t: 'cadeia', type: 'cadeia', v: t.v, line: t.line }; }
      if (t.t === 'chr') { next(); return { k: 'lit', t: 'caractere', type: 'caractere', v: t.v, line: t.line }; }
      if (t.t === 'kw' && (t.v === 'verdadeiro' || t.v === 'falso')) { next(); return { k: 'lit', t: 'logico', type: 'logico', v: t.v === 'verdadeiro', line: t.line }; }
      if (t.t === 'id') {
        next();
        if (isOp('(')) err(t.line, 'NAO_ENSINADO', `"${t.v}(...)" não é um comando conhecido`,
          'Aqui só usamos os comandos escreva() e leia(). Esse nome não é uma variável nem um comando.', 'Confira a grafia do comando.', true);
        const s = lookup(t.v);
        if (!s) { naoDeclarada(t); return { k: 'var', name: t.v, type: '?', line: t.line }; }
        return { k: 'var', name: t.v, type: s.type, line: t.line };
      }
      if (isOp('(')) {
        next();
        const e = parseExpr();
        if (isOp(')')) next();
        else err(prevLine(), 'PAREN_NAO_FECHADO', 'Parêntese não fechado',
          'Todo parêntese aberto precisa ter seu correspondente fechamento. Você abriu um parêntese na conta/condição e não fechou.', 'Coloque o ) no lugar certo.');
        return e;
      }
      err(t.line, 'EXPRESSAO_INVALIDA', `Faltou um valor antes de ${nome(t)}`,
        `Era esperado um valor (número, texto entre aspas ou nome de variável), mas encontrei ${nome(t)}.`,
        'Verifique se não esqueceu algum valor ou se há um símbolo sobrando.', true);
    }

    /* ----- comandos */
    function parseProgram() {
      if (!isKw('programa')) err(peek().line, 'SEM_PROGRAMA', 'Falta a palavra programa',
        'Todo algoritmo começa com a palavra programa, sozinha na primeira linha, seguida de uma chave {.', 'Escreva programa na primeira linha.', true);
      next();
      if (!isOp('{')) err(prevLine(), 'PROGRAMA_SEM_CHAVE', 'Falta abrir a chave depois de programa',
        'Depois da palavra programa vem uma chave { que abre o corpo do programa.', 'Escreva { na linha de baixo.', true);
      const open = next();
      let achouFuncao = false;
      while (!isOp('}')) {
        const t = peek();
        if (t.t === 'eof') err(open.line, 'CHAVE_NAO_FECHADA', 'Chave de fechamento ausente',
          'Está faltando uma chave de fechamento. Verifique se a função e o programa foram fechados corretamente.',
          `A chave { da linha ${open.line} (programa) ainda não foi fechada. Cada { precisa de um } correspondente.`, true);
        if (t.t === 'kw' && TIPOS.includes(t.v)) { globals.push(parseDecl()); continue; }
        if (isKw('funcao')) { achouFuncao = true; parseFuncao(); continue; }
        err(t.line, 'FORA_DA_FUNCAO', 'Comando fora da função inicio()',
          'Há um comando fora da função inicio(). Isso costuma acontecer quando uma chave } fecha a função antes da hora, ou quando o comando foi escrito no lugar errado.',
          'Todos os comandos ficam dentro das chaves de funcao inicio(). Verifique se há um } sobrando acima desta linha.', true);
      }
      next();
      if (peek().t !== 'eof') err(peek().line, 'CODIGO_DEPOIS_FIM', 'Código depois do fim do programa',
        'Depois da chave que fecha o programa não pode haver mais nada. Provavelmente há uma chave } sobrando.', 'Apague o que está depois da última chave.', true);
      if (!achouFuncao) err(open.line, 'SEM_INICIO', 'Falta a função inicio()',
        'O programa precisa de uma função inicio(): é por ela que a execução começa.', 'Escreva funcao inicio() dentro do programa.', true);
    }
    let mainBody = [];
    function parseFuncao() {
      const f = next();
      const t = peek();
      if (!(t.t === 'kw' && t.v === 'inicio')) err(t.line, 'FUNCAO_NOME', 'A função principal deve se chamar inicio',
        'No Portugol, a execução começa na função chamada inicio().', 'Escreva funcao inicio().', true);
      next();
      if (isOp('(')) {
        next();
        if (isOp(')')) next();
        else err(prevLine(), 'PAREN_NAO_FECHADO', 'Parêntese não fechado em inicio()', 'A função inicio() deve ter os parênteses vazios: ().', 'Escreva inicio().', true);
      } else err(f.line, 'INICIO_SEM_PARENTESES', 'A função inicio precisa dos parênteses',
        'A função inicio precisa dos parênteses: inicio(). Eles fazem parte do nome da função, mesmo vazios.', 'Escreva funcao inicio().');
      if (!isOp('{')) err(prevLine(), 'FUNCAO_SEM_CHAVE', 'Falta abrir a chave da função',
        'Depois de funcao inicio() vem uma chave { que abre o bloco com os comandos.', 'Escreva { na linha de baixo.', true);
      mainBody = parseBlock();
    }
    function parseBlock() {
      const open = next(); // {
      scopes.push(new Map());
      const stmts = []; let viuComando = false;
      while (!isOp('}')) {
        if (peek().t === 'eof') err(open.line, 'CHAVE_NAO_FECHADA', 'Chave de fechamento ausente',
          'Está faltando uma chave de fechamento. Verifique se a função e o programa foram fechados corretamente.',
          `A chave { da linha ${open.line} não tem um } correspondente. Cada { precisa de um }.`, true);
        const before = p;
        const s = parseStatement();
        if (s) {
          if (s.k === 'decl') {
            if (viuComando) warnings.push({ line: s.line, titulo: 'Declaração depois de comandos',
              explicacao: 'Por organização, declare as variáveis no início da função, antes dos comandos. Funciona, mas fica mais fácil de entender.' });
          } else viuComando = true;
          stmts.push(s);
        }
        if (p === before) next();
      }
      next(); scopes.pop();
      return stmts;
    }
    function parseStatement() {
      const t = peek();
      if (t.t === 'kw') {
        if (TIPOS.includes(t.v)) { const d = parseDecl(); eatSemi(); return d; }
        switch (t.v) {
          case 'escreva': { const s = parseEscreva(); eatSemi(); return s; }
          case 'leia': { const s = parseLeia(); eatSemi(); return s; }
          case 'se': return parseSe();
          case 'escolha': return parseEscolha();
          case 'pare':
            next(); stats.pare++;
            if (escolhaDepth === 0) err(t.line, 'PARE_FORA', 'pare fora do escolha', 'O comando pare serve para encerrar um caso dentro da estrutura escolha. Aqui não há escolha para encerrar.', 'Apague o pare ou coloque-o dentro de um caso.');
            eatSemi();
            return { k: 'pare', line: t.line };
          case 'senao':
            next();
            err(t.line, 'SENAO_SOLTO', 'senao sem um se', 'O senao só existe junto com um se: ele é o "caso contrário". Ele deve ficar logo depois da chave } que fecha o se.',
              'Coloque o senao logo após o } do bloco do se, antes de qualquer outro comando.');
            if (isOp('{')) parseBlock();
            return null;
          case 'caso': case 'contrario':
            next();
            err(t.line, 'CASO_FORA', 'caso fora do escolha', 'O caso só pode aparecer dentro das chaves de uma estrutura escolha (valor) { ... }.',
              'Monte primeiro o escolha (variavel) { } e coloque os casos dentro das chaves dele.');
            skipLine(t.line);
            return null;
          case 'funcao':
            next();
            err(t.line, 'FUNCAO_DENTRO', 'Função dentro de função', 'Neste nível, não criamos outras funções. Os comandos ficam direto dentro de inicio().', 'Apague esta linha.');
            skipLine(t.line);
            return null;
          default:
            next();
            err(t.line, 'NAO_ENTENDI', `"${t.v}" não pode começar uma linha aqui`, `A palavra "${t.v}" está em um lugar onde o Portugol não espera.`, 'Confira a ordem dos comandos e das palavras.');
            skipLine(t.line);
            return null;
        }
      }
      if (t.t === 'op' && t.v === '{') return { k: 'block', body: parseBlock(), line: t.line };
      if (t.t === 'op' && t.v === ';') { eatSemi(); return null; }
      if (t.t === 'id') {
        const n1 = peek(1);
        if (n1.t === 'op' && n1.v === '=') return parseAtrib();
        if (n1.t === 'kw' && TIPOS.includes(n1.v)) {
          next(); next();
          scopes[scopes.length - 1].set(t.v, { type: n1.v });
          stats.decls.push({ name: t.v, type: n1.v, line: t.line });
          err(t.line, 'TIPO_INVERTIDO', 'A ordem da declaração está invertida',
            'A ordem está invertida. Primeiro informamos o tipo da variável e depois seu nome.', `Escreva ${n1.v} ${t.v}`);
          return null;
        }
        if (n1.t === 'op' && n1.v === '==') {
          err(t.line, 'COMPARACAO_COMO_ATRIBUICAO', 'Você usou == onde queria atribuir um valor',
            'O sinal = ATRIBUI um valor à variável (guarda). O sinal == COMPARA dois valores (pergunta se são iguais). Para guardar um valor, use apenas um =.',
            `Escreva ${t.v} = valor`);
          next(); next(); try { parseExpr(); } catch (e) { if (!(e instanceof Fatal)) throw e; }
          return null;
        }
        if (n1.t === 'op' && n1.v === '(') {
          next();
          const sug = parecido(t.v, COMANDOS);
          if (NAO_ENSINADOS.has(t.v)) err(t.line, 'NAO_ENSINADO', `"${t.v}" ainda não faz parte deste treinamento`, 'Esse comando existe no Portugol, mas ainda não será usado aqui.', 'Use apenas os comandos ensinados nos módulos.');
          else err(t.line, 'COMANDO_DESCONHECIDO', `Comando desconhecido: ${t.v}`,
            `O computador não conhece o comando "${t.v}". ${sug ? `Será que você quis escrever "${sug}"? ` : ''}O Portugol diferencia letras maiúsculas e minúsculas.`,
            sug ? `Troque por ${sug}(...)` : 'Os comandos que conhecemos são escreva() e leia().');
          skipLine(t.line);
          return null;
        }
        if (NAO_ENSINADOS.has(t.v)) {
          next();
          err(t.line, 'NAO_ENSINADO', `"${t.v}" ainda não faz parte deste treinamento`, 'Esse recurso existe no Portugol, mas não será usado nos módulos.', 'Use apenas os comandos ensinados.');
          skipLine(t.line); return null;
        }
        if (t.v === 'outrocaso') {
          next();
          err(t.line, 'OUTROCASO', 'No Portugol WebStudio o caso padrão é "caso contrario:"', 'O comando outrocaso não existe nesta linguagem. Para o caso em que nenhuma opção combina, escreva: caso contrario:', 'Troque por caso contrario:');
          skipLine(t.line); return null;
        }
        const sugT = parecido(t.v, TIPOS) || (n1.t === 'id' ? null : null);
        const sugC = parecido(t.v, COMANDOS);
        next();
        const sug = sugT || sugC;
        err(t.line, sug ? 'GRAFIA' : 'NAO_ENTENDI', sug ? `"${t.v}" parece um erro de digitação` : `Não entendi "${t.v}"`,
          sug ? `Não existe "${t.v}". Será que você quis escrever "${sug}"? Letras maiúsculas/minúsculas e acentos fazem diferença.`
            : `A linha começa com "${t.v}", mas isso não é um tipo (inteiro, real...), nem um comando, nem uma variável seguida de =.`,
          sug ? `Escreva ${sug}` : 'Para guardar um valor use nome = valor. Para mostrar algo use escreva(...).');
        skipLine(t.line);
        return null;
      }
      next();
      err(t.line, 'NAO_ENTENDI', `Não entendi ${nome(t)}`, `O símbolo ${nome(t)} está em um lugar onde o Portugol não espera.`, 'Apague ou corrija essa parte.');
      skipLine(t.line);
      return null;
    }
    function parseDecl() {
      const tt = next();
      const items = [];
      do {
        const idt = peek();
        if (idt.t !== 'id') {
          if (idt.t === 'kw') { next(); err(idt.line, 'NOME_RESERVADO', `"${idt.v}" é uma palavra reservada`, 'Palavras como se, escreva, programa já têm função na linguagem e não podem ser nomes de variáveis.', 'Escolha outro nome para a variável.'); continue; }
          err(prevLine(), 'DECL_SEM_NOME', 'Falta o nome da variável', `Depois do tipo ${tt.v} precisa vir o nome da variável. Exemplo: ${tt.v} nome`, `Escreva ${tt.v} e o nome que você quer dar.`);
          skipLine(prevLine());
          break;
        }
        next();
        declare(idt.v, tt.v, idt.line);
        let init = null;
        if (isOp('==')) { err(idt.line, 'COMPARACAO_COMO_ATRIBUICAO', 'Use apenas um = para guardar valor', 'Para guardar um valor use =. O sinal == serve para comparar.', `Escreva ${tt.v} ${idt.v} = valor`); next(); }
        else if (isOp('=')) next();
        if (toks[p - 1] && toks[p - 1].t === 'op' && (toks[p - 1].v === '=' || toks[p - 1].v === '==')) {
          init = parseExpr();
          if (!compat(tt.v, init.type)) mismatch(idt.line, tt.v, init.type, idt.v);
        }
        items.push({ name: idt.v, type: tt.v, init });
      } while (isOp(',') && next());
      return { k: 'decl', items, line: tt.line };
    }
    function parseAtrib() {
      const idt = next(); next(); // id e '='
      const s = lookup(idt.v);
      if (!s) naoDeclarada(idt);
      const e = parseExpr();
      if (s && !compat(s.type, e.type)) mismatch(idt.line, s.type, e.type, idt.v);
      stats.atrib++;
      eatSemi();
      return { k: 'assign', name: idt.v, expr: e, line: idt.line };
    }
    function fechaParen(line, nomeCmd) {
      if (isOp(')')) { next(); return; }
      const t = peek();
      if (t.line === prevLine() && (t.t === 'str' || t.t === 'num' || t.t === 'id'))
        err(prevLine(), 'FALTA_VIRGULA', 'Falta uma vírgula entre os itens', `Dentro de ${nomeCmd}(...), os itens são separados por vírgula.`, 'Coloque uma vírgula entre os itens.');
      else err(prevLine(), 'PAREN_NAO_FECHADO', 'Parêntese não fechado',
        `Você abriu o comando ${nomeCmd}, mas esqueceu de fechar o parêntese. Todo parêntese aberto precisa ter seu correspondente fechamento.`, `Termine o comando com ) — por exemplo: ${nomeCmd}(...)`);
      skipLine(prevLine());
    }
    function parseEscreva() {
      const kw = next(); stats.escreva++;
      if (!isOp('(')) {
        err(kw.line, 'ESCREVA_SEM_PARENTESES', 'O escreva precisa de parênteses',
          'O comando escreva precisa de parênteses: escreva(...). Se for mostrar um texto, ele também precisa ficar entre aspas: escreva("texto").', 'Escreva escreva("sua mensagem")');
        skipLine(kw.line);
        return { k: 'escreva', args: [], line: kw.line };
      }
      next();
      const args = [];
      if (!isOp(')')) do { args.push(parseExpr()); } while (isOp(',') && next());
      fechaParen(kw.line, 'escreva');
      return { k: 'escreva', args, line: kw.line };
    }
    function parseLeia() {
      const kw = next(); stats.leia++;
      if (!isOp('(')) {
        err(kw.line, 'LEIA_SEM_PARENTESES', 'O leia precisa de parênteses', 'O comando leia precisa de parênteses com o nome da variável dentro: leia(nome).', 'Escreva leia(nomeDaVariavel)');
        skipLine(kw.line);
        return { k: 'leia', vars: [], line: kw.line };
      }
      next();
      const vars = [];
      do {
        const t = peek();
        if (t.t === 'str') {
          next();
          err(t.line, 'LEIA_ASPAS', 'Nome da variável entre aspas no leia',
            'Você deve informar o nome da variável que receberá o dado, e não escrever o nome dela entre aspas.', `Troque leia("${t.v}") por leia(${t.v})`);
        } else if (t.t === 'id') {
          next();
          const s = lookup(t.v);
          if (!s) naoDeclarada(t); else vars.push({ name: t.v, type: s.type });
        } else if (t.t === 'op' && t.v === ')') {
          err(prevLine(), 'LEIA_VAZIO', 'O leia está vazio', 'Dentro do leia() você precisa dizer em qual variável o dado digitado será guardado.', 'Escreva leia(nomeDaVariavel)');
          break;
        } else err(t.line, 'LEIA_ARGUMENTO', 'O leia espera o nome de uma variável', 'Dentro do leia() só vai o nome de uma variável já declarada.', 'Exemplo: leia(idade)', true);
      } while (isOp(',') && next());
      fechaParen(kw.line, 'leia');
      return { k: 'leia', vars, line: kw.line };
    }
    function parseSe() {
      const kw = next(); stats.se++;
      let temParen = false;
      if (isOp('(')) { temParen = true; next(); }
      else err(kw.line, 'SE_SEM_PARENTESES', 'A condição do se precisa de parênteses',
        'A condição do se deve ficar entre parênteses: se (idade >= 18). Os parênteses mostram onde a condição começa e termina.', 'Escreva se (condição)');
      const a = p;
      const cond = parseExpr();
      const texto = toks.slice(a, p).map(t => t.raw).join(' ');
      if (isOp('=')) {
        err(peek().line, 'ATRIBUICAO_NA_CONDICAO', 'Use == para comparar',
          'Dentro de uma condição, o sinal = não compara: ele guarda valor. Para perguntar "é igual?", use ==.', 'Troque = por ==');
        next(); parseExpr();
      }
      if (temParen) {
        if (isOp(')')) next();
        else err(prevLine(), 'PAREN_NAO_FECHADO', 'Parêntese da condição não fechado', 'Todo parêntese aberto precisa ter seu correspondente fechamento. Feche a condição do se com ).', 'Escreva se (condição)');
      }
      if (cond.type !== 'logico' && cond.type !== '?') err(kw.line, 'CONDICAO_TIPO', 'A condição precisa dar verdadeiro ou falso',
        'Uma condição é uma pergunta com resposta verdadeiro ou falso, como idade >= 18. Aqui o resultado é um valor do tipo ' + cond.type + '.', 'Use um operador de comparação: ==, !=, >, <, >=, <=.');
      let entao, senao = null;
      if (isOp('{')) entao = parseBlock();
      else {
        err(prevLine(), 'SE_SEM_CHAVES', 'Faltam as chaves do se', 'Os comandos que dependem da condição ficam entre chaves { }. As chaves delimitam o bloco que será executado.', 'Abra uma chave { na linha de baixo e feche com } depois dos comandos.');
        const s = parseStatement(); entao = s ? [s] : [];
      }
      if (isKw('senao')) {
        const st = next(); stats.senao++;
        if (isKw('se')) senao = [parseSe()];
        else if (isOp('{')) senao = parseBlock();
        else {
          err(st.line, 'SE_SEM_CHAVES', 'Faltam as chaves do senao', 'O bloco do senao também fica entre chaves { }.', 'Abra { depois do senao e feche com }.');
          const s = parseStatement(); senao = s ? [s] : [];
        }
      }
      return { k: 'se', cond, text: texto, then: entao, else: senao, line: kw.line };
    }
    function parseEscolha() {
      const kw = next(); stats.escolha++;
      let temParen = false;
      if (isOp('(')) { temParen = true; next(); }
      else err(kw.line, 'ESCOLHA_SEM_PARENTESES', 'O escolha precisa de parênteses', 'Depois de escolha, coloque entre parênteses a variável que será analisada: escolha (opcao).', 'Escreva escolha (variavel)');
      const sel = parseExpr();
      if (temParen) {
        if (isOp(')')) next();
        else err(prevLine(), 'PAREN_NAO_FECHADO', 'Parêntese do escolha não fechado', 'Todo parêntese aberto precisa ter seu correspondente fechamento.', 'Feche com ) depois da variável.');
      }
      if (!isOp('{')) err(prevLine(), 'ESCOLHA_SEM_CHAVE', 'Falta abrir a chave do escolha', 'Os casos do escolha ficam dentro de chaves { }.', 'Escreva { na linha de baixo.', true);
      const open = next();
      escolhaDepth++; scopes.push(new Map());
      const casos = [];
      while (!isOp('}')) {
        if (peek().t === 'eof') err(open.line, 'CHAVE_NAO_FECHADA', 'Chave de fechamento ausente', 'Está faltando uma chave de fechamento. O escolha precisa terminar com }.', `A chave { da linha ${open.line} (escolha) não foi fechada.`, true);
        if (isKw('caso')) {
          const ct = next(); stats.caso++;
          const c = { line: ct.line, isDefault: false, value: null, body: [] };
          if (isKw('contrario')) { next(); c.isDefault = true; }
          else {
            c.value = parseExpr();
            const lit = c.value.k === 'lit' || (c.value.k === 'un' && c.value.op === '-' && c.value.e.k === 'lit');
            if (!lit) err(ct.line, 'CASO_NAO_LITERAL', 'O caso precisa de um valor fixo', 'Depois de caso vai um valor fixo, como 1 ou "a", e não uma conta ou variável.', 'Exemplo: caso 1:');
            else if (sel.type !== '?' && !compat(sel.type, c.value.type)) err(ct.line, 'CASO_TIPO', 'Valor do caso incompatível com o escolha',
              `Você está escolhendo pela variável (tipo ${sel.type}), mas o caso usa um valor do tipo ${c.value.type}. Os valores dos casos devem ser do mesmo tipo da variável.`,
              sel.type === 'inteiro' ? 'Use números sem aspas: caso 1:' : sel.type === 'caractere' ? "Use um caractere entre aspas simples: caso 'a':" : 'Use valores do mesmo tipo da variável.');
          }
          if (isOp(':')) next();
          else err(prevLine(), 'CASO_SEM_DOISPONTOS', 'Faltam os dois-pontos depois do caso', 'Depois do valor de cada caso precisam vir dois-pontos (:). Eles indicam "a partir daqui são os comandos deste caso".', 'Escreva caso 1:  — com : no final.');
          casos.push(c);
          continue;
        }
        const before = p;
        const s = parseStatement();
        if (s) {
          if (!casos.length) { err(s.line, 'ESCOLHA_SEM_CASO', 'Comando fora de um caso', 'Dentro do escolha, os comandos precisam estar depois de um "caso valor:".', 'Escreva primeiro o caso.'); }
          else casos[casos.length - 1].body.push(s);
        }
        if (p === before) next();
      }
      next(); escolhaDepth--; scopes.pop();
      casos.forEach((c, i) => {
        const last = c.body[c.body.length - 1];
        if (i < casos.length - 1 && c.body.length && !(last && last.k === 'pare'))
          warnings.push({ line: c.line, titulo: 'Caso sem pare', explicacao: 'Sem o comando pare, o programa continua executando os comandos do próximo caso. Se não é isso que você quer, coloque pare no final deste caso.' });
      });
      return { k: 'escolha', sel, casos, line: kw.line };
    }

    let ast = null;
    try { parseProgram(); ast = { globals, main: mainBody, stats }; }
    catch (e) { if (!(e instanceof Fatal)) throw e; }
    const vistos = new Set();
    const strLinhas = new Set(errors.filter(e => e.code === 'STRING_ABERTA').map(e => e.line));
    const lista = errors.filter(e => { if (e.code === 'PAREN_NAO_FECHADO' && strLinhas.has(e.line)) return false; const k = e.line + e.code; if (vistos.has(k)) return false; vistos.add(k); return true; })
      .sort((a, b) => a.line - b.line);
    return { ok: lista.length === 0 && !!ast, errors: lista, warnings, ast: lista.length ? null : ast, tokens: toks, stats };
  }

  /* ---------------------------------------------------------------- EXECUÇÃO */
  class RunErr extends Error {
    constructor(line, titulo, explicacao, dica) { super(titulo); this.info = { line, titulo, explicacao, dica: dica || '' }; }
  }
  class Stopped extends Error { }

  function fmt(t, v) {
    if (t === 'logico') return v ? 'verdadeiro' : 'falso';
    if (t === 'real') return Number.isInteger(v) ? v.toFixed(1) : String(+v.toPrecision(12));
    return String(v);
  }
  const padrao = t => (t === 'inteiro' || t === 'real' ? 0 : t === 'logico' ? false : '');

  function converteEntrada(raw, nm, tipo, line) {
    const s = raw.trim();
    const ruim = (porque) => new RunErr(line, `Valor incompatível com o tipo ${tipo}`,
      `A variável "${nm}" é do tipo ${tipo} e ${porque} Você digitou "${raw}".`,
      'Execute novamente e digite um valor do tipo certo, ou revise o tipo usado na declaração da variável.');
    if (tipo === 'inteiro') { if (!/^[-+]?\d+$/.test(s)) throw ruim('só aceita números inteiros, sem vírgula e sem letras.'); return parseInt(s, 10); }
    if (tipo === 'real') { const x = s.replace(',', '.'); if (!/^[-+]?\d+(\.\d+)?$/.test(x)) throw ruim('só aceita números (pode ter casas decimais).'); return parseFloat(x); }
    if (tipo === 'logico') { if (s !== 'verdadeiro' && s !== 'falso') throw ruim('só aceita verdadeiro ou falso.'); return s === 'verdadeiro'; }
    if (tipo === 'caractere') { if (raw.length < 1) throw ruim('precisa de exatamente um caractere.'); return raw[0]; }
    return raw;
  }

  async function run(ast, io, ctl) {
    ctl = ctl || {};
    const todas = new Map(), scopes = [new Map()];
    let steps = 0;
    const snapshot = () => [...todas.values()].map(c => ({ name: c.name, type: c.type, value: c.value, texto: fmt(c.type, c.value) }));
    const notify = nm => io.onMemory && io.onMemory(snapshot(), nm);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const find = nm => { for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(nm)) return scopes[i].get(nm); return null; };
    function criar(nm, tipo, val) {
      const cell = { name: nm, type: tipo, value: val === undefined ? padrao(tipo) : val };
      scopes[scopes.length - 1].set(nm, cell); todas.set(nm, cell);
    }
    function ev(n) {
      switch (n.k) {
        case 'lit': return { t: n.t, v: n.v };
        case 'var': { const c = find(n.name); return { t: c.type, v: c.value }; }
        case 'un': { const x = ev(n.e); return n.op === 'nao' ? { t: 'logico', v: !x.v } : { t: x.t, v: -x.v }; }
        case 'bin': {
          if (n.op === 'e') { const a = ev(n.l); return { t: 'logico', v: a.v ? !!ev(n.r).v : false }; }
          if (n.op === 'ou') { const a = ev(n.l); return { t: 'logico', v: a.v ? true : !!ev(n.r).v }; }
          const a = ev(n.l), b = ev(n.r);
          switch (n.op) {
            case '+':
              if (n.type === 'cadeia') return { t: 'cadeia', v: fmt(a.t, a.v) + fmt(b.t, b.v) };
              return { t: n.type, v: a.v + b.v };
            case '-': return { t: n.type, v: a.v - b.v };
            case '*': return { t: n.type, v: a.v * b.v };
            case '/':
              if (b.v === 0) throw new RunErr(n.line, 'Divisão por zero', 'Não existe divisão por zero. O valor que está dividindo (o divisor) era 0.', 'Teste outro valor ou use um se para evitar dividir por zero.');
              return { t: n.type, v: n.type === 'inteiro' ? Math.trunc(a.v / b.v) : a.v / b.v };
            case '%':
              if (b.v === 0) throw new RunErr(n.line, 'Divisão por zero', 'Não é possível calcular o resto da divisão por zero.', '');
              return { t: n.type, v: a.v % b.v };
            case '==': return { t: 'logico', v: a.v === b.v };
            case '!=': return { t: 'logico', v: a.v !== b.v };
            case '>': return { t: 'logico', v: a.v > b.v };
            case '<': return { t: 'logico', v: a.v < b.v };
            case '>=': return { t: 'logico', v: a.v >= b.v };
            case '<=': return { t: 'logico', v: a.v <= b.v };
          }
        }
      }
      throw new Error('nó desconhecido');
    }
    async function bloco(stmts, novoEscopo = true) {
      if (novoEscopo) scopes.push(new Map());
      try {
        for (const s of stmts) { const sig = await exec(s); if (sig) return sig; }
      } finally { if (novoEscopo) scopes.pop(); }
      return null;
    }
    async function exec(s) {
      if (ctl.stopped) throw new Stopped();
      if (++steps > 200000) throw new RunErr(s.line, 'Programa executou instruções demais', 'O programa parece não terminar nunca.', '');
      if (steps % 40 === 0) await sleep(0);
      switch (s.k) {
        case 'decl':
          for (const it of s.items) {
            if (it.init) { const r = ev(it.init); criar(it.name, it.type, r.v); } else criar(it.name, it.type);
          }
          notify(s.items[s.items.length - 1].name);
          if (ctl.delay) await sleep(ctl.delay);
          return null;
        case 'assign': {
          const r = ev(s.expr), c = find(s.name);
          c.value = r.v; notify(s.name);
          if (ctl.delay) await sleep(ctl.delay);
          return null;
        }
        case 'escreva':
          io.write(s.args.map(a => { const r = ev(a); return fmt(r.t, r.v); }).join(''));
          if (ctl.delay) await sleep(ctl.delay / 2);
          return null;
        case 'leia':
          for (const v of s.vars) {
            const c = find(v.name);
            const raw = await io.read(v.name, c.type);
            if (ctl.stopped) throw new Stopped();
            c.value = converteEntrada(raw, v.name, c.type, s.line);
            notify(v.name);
          }
          return null;
        case 'se': {
          const r = ev(s.cond);
          if (io.trace) io.trace(s.line, s.text, r.v);
          if (r.v) return bloco(s.then);
          if (s.else) return bloco(s.else);
          return null;
        }
        case 'escolha': {
          const x = ev(s.sel);
          let idx = s.casos.findIndex(c => !c.isDefault && ev(c.value).v === x.v);
          if (io.trace) io.trace(s.line, `escolha (${fmt(x.t, x.v)})`, idx >= 0 ? 'caso ' + fmt(s.casos[idx].value.t, s.casos[idx].value.v) : 'caso contrario');
          if (idx < 0) idx = s.casos.findIndex(c => c.isDefault);
          if (idx < 0) return null;
          scopes.push(new Map());
          try {
            for (let i = idx; i < s.casos.length; i++)
              for (const st of s.casos[i].body) { const sig = await exec(st); if (sig === 'pare') return null; }
          } finally { scopes.pop(); }
          return null;
        }
        case 'pare': return 'pare';
        case 'block': return bloco(s.body);
      }
      return null;
    }
    try {
      for (const g of ast.globals) await exec(g);
      await bloco(ast.main, false);
      notify();
      return { ok: true, vars: snapshot() };
    } catch (e) {
      if (e instanceof Stopped) return { ok: false, stopped: true, vars: snapshot() };
      if (e instanceof RunErr) return { ok: false, error: e.info, vars: snapshot() };
      throw e;
    }
  }

  G.Portugol = { compile, run, lex, fmt, TIPOS, KW, COMANDOS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
