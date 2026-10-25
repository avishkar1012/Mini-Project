/* ======================================================================
   PART 1: CORE LOGIC (same algorithms as the C++ project)
   tokenizer, shunting-yard, expression tree, traversals, evaluation
   ====================================================================== */
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '~': 3, '^': 4 };
const isUnary = (o) => o === '~';
const rightAssoc = (o) => o === '^' || o === '~';
const isOperand = (t) => t.type === 'NUM' || t.type === 'VAR';

function tokenize(s, mode, single) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
      let j = i, dots = 0;
      while (j < s.length && /[0-9.]/.test(s[j])) { if (s[j] === '.') dots++; j++; }
      if (dots > 1) throw new Error("Invalid number '" + s.slice(i, j) + "'");
      out.push({ type: 'NUM', text: s.slice(i, j) });
      i = j;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      if (!single) while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      out.push({ type: 'VAR', text: s.slice(i, j) });
      i = j;
    } else if (c === '(' || c === ')') {
      if (mode !== 'infix') throw new Error('Parentheses are not allowed in postfix or prefix expressions');
      out.push({ type: c === '(' ? 'LP' : 'RP', text: c });
      i++;
    } else if (c === '~') {
      if (mode === 'infix') throw new Error("Use '-' for negation in infix expressions");
      out.push({ type: 'OP', text: '~' });
      i++;
    } else if ('+-*/%^'.includes(c)) {
      let op = c;
      if (mode === 'infix' && (c === '-' || c === '+')) {
        const prev = out[out.length - 1];
        const unaryPos = !prev || prev.type === 'OP' || prev.type === 'LP';
        if (unaryPos) {
          if (c === '+') { i++; continue; }
          op = '~';
        }
      }
      out.push({ type: 'OP', text: op });
      i++;
    } else {
      throw new Error("Invalid character '" + c + "'");
    }
  }
  if (!out.length) throw new Error('Type an expression to begin');
  return out;
}

// Shunting-yard. Records every step for the trace view.
function infixToPostfix(tokens) {
  const out = [], st = [], steps = [];
  const snap = (tok, note) => steps.push({ tok: tok.text, stack: st.map((t) => t.text), out: out.map((t) => t.text), note });
  for (const t of tokens) {
    let note = '';
    if (isOperand(t)) {
      out.push(t);
      note = 'Operand goes straight to the output';
    } else if (t.type === 'LP') {
      st.push(t);
      note = 'Push ( onto the stack';
    } else if (t.type === 'RP') {
      let found = false;
      const popped = [];
      while (st.length) {
        const x = st.pop();
        if (x.type === 'LP') { found = true; break; }
        out.push(x);
        popped.push(x.text);
      }
      if (!found) throw new Error("Mismatched parentheses: extra ')'");
      note = popped.length ? 'Pop ' + popped.join(' ') + ' to the output until ( is found, discard (' : 'Discard the matching (';
    } else if (isUnary(t.text)) {
      st.push(t);
      note = 'Unary minus: push without popping anything';
    } else {
      const popped = [];
      while (st.length && st[st.length - 1].type === 'OP') {
        const o2 = st[st.length - 1].text;
        if (PREC[o2] > PREC[t.text] || (PREC[o2] === PREC[t.text] && !rightAssoc(t.text))) {
          out.push(st.pop());
          popped.push(o2);
        } else break;
      }
      st.push(t);
      note = (popped.length ? 'Pop ' + popped.join(' ') + ' (binds at least as tight), then ' : '') + 'push ' + t.text;
    }
    snap(t, note);
  }
  const rest = [];
  while (st.length) {
    const x = st.pop();
    if (x.type === 'LP') throw new Error("Mismatched parentheses: missing ')'");
    out.push(x);
    rest.push(x.text);
  }
  steps.push({ tok: 'end', stack: [], out: out.map((t) => t.text), note: rest.length ? 'Pop the remaining ' + rest.join(' ') + ' to the output' : 'Nothing left on the stack' });
  return { postfix: out, steps };
}

function node(tok) { return { tok, left: null, right: null }; }

function buildFromPostfix(pf) {
  const st = [];
  for (const t of pf) {
    if (isOperand(t)) st.push(node(t));
    else if (t.type === 'OP') {
      const need = isUnary(t.text) ? 1 : 2;
      if (st.length < need) throw new Error("Operator '" + t.text + "' is missing an operand");
      const n = node(t);
      if (need === 1) n.left = st.pop();
      else { n.right = st.pop(); n.left = st.pop(); }
      st.push(n);
    }
  }
  if (st.length !== 1) throw new Error('Operands and operators do not match');
  return st[0];
}

function buildFromPrefix(pre) {
  const st = [];
  for (let k = pre.length - 1; k >= 0; k--) {
    const t = pre[k];
    if (isOperand(t)) st.push(node(t));
    else if (t.type === 'OP') {
      const need = isUnary(t.text) ? 1 : 2;
      if (st.length < need) throw new Error("Operator '" + t.text + "' is missing an operand");
      const n = node(t);
      n.left = st.pop();
      if (need === 2) n.right = st.pop();
      st.push(n);
    }
  }
  if (st.length !== 1) throw new Error('Operands and operators do not match');
  return st[0];
}

const postorder = (n, o = []) => { if (n) { postorder(n.left, o); postorder(n.right, o); o.push(n.tok); } return o; };
const preorder = (n, o = []) => { if (n) { o.push(n.tok); preorder(n.left, o); preorder(n.right, o); } return o; };

function needParen(child, parentOp, isRight) {
  if (child.tok.type !== 'OP') return false;
  const c = child.tok.text;
  if (PREC[c] < PREC[parentOp]) return true;
  if (isUnary(c)) return isRight;
  if (PREC[c] === PREC[parentOp]) return isRight ? !rightAssoc(parentOp) : rightAssoc(parentOp);
  return false;
}

function toInfix(n) {
  if (n.tok.type !== 'OP') return n.tok.text;
  const op = n.tok.text;
  if (isUnary(op)) {
    const c = toInfix(n.left);
    const paren = n.left.tok.type === 'OP' && (isUnary(n.left.tok.text) || PREC[n.left.tok.text] < PREC['~']);
    return '-' + (paren ? '(' + c + ')' : c);
  }
  let l = toInfix(n.left), r = toInfix(n.right);
  if (needParen(n.left, op, false)) l = '(' + l + ')';
  if (needParen(n.right, op, true)) r = '(' + r + ')';
  const sep = op === '^' ? '' : ' ';
  return l + sep + op + sep + r;
}

function applyOp(op, a, b) {
  let r;
  if (op === '+') r = a + b;
  else if (op === '-') r = a - b;
  else if (op === '*') r = a * b;
  else if (op === '/') { if (b === 0) throw new Error('Division by zero'); r = a / b; }
  else if (op === '%') { if (b === 0) throw new Error('Modulo by zero'); r = a % b; }
  else if (op === '^') r = Math.pow(a, b);
  if (!Number.isFinite(r)) throw new Error('Result is not a finite number');
  return r;
}

function fmtNum(v) { return String(parseFloat(v.toPrecision(10))); }

function operandValue(t, vars) {
  if (t.type === 'NUM') return parseFloat(t.text);
  const v = vars[t.text];
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error('Enter a value for ' + t.text);
  return v;
}

// mode 'postfix' scans left to right, 'prefix' scans right to left. Returns {value, steps}
function evaluate(tokens, vars, mode) {
  const st = [], steps = [];
  const seq = mode === 'prefix' ? tokens.slice().reverse() : tokens;
  for (const t of seq) {
    let note;
    if (isOperand(t)) {
      const v = operandValue(t, vars);
      st.push(v);
      note = 'Push ' + (t.type === 'VAR' ? t.text + ' = ' : '') + fmtNum(v);
    } else if (isUnary(t.text)) {
      const a = st.pop();
      st.push(-a);
      note = 'Negate ' + fmtNum(a) + ' to ' + fmtNum(-a);
    } else {
      let a, b;
      if (mode === 'prefix') { a = st.pop(); b = st.pop(); } else { b = st.pop(); a = st.pop(); }
      const r = applyOp(t.text, a, b);
      st.push(r);
      note = fmtNum(a) + ' ' + t.text + ' ' + fmtNum(b) + ' = ' + fmtNum(r);
    }
    steps.push({ tok: t.text, stack: st.map(fmtNum), note });
  }
  if (st.length !== 1) throw new Error('Invalid expression');
  return { value: st[0], steps };
}

function parse(text, mode) {
  const s = text.trim();
  const single = mode !== 'infix' && !/\s/.test(s);
  const tokens = tokenize(s, mode, single);
  let tree, convSteps = null;
  if (mode === 'infix') {
    const r = infixToPostfix(tokens);
    convSteps = r.steps;
    tree = buildFromPostfix(r.postfix);
  } else if (mode === 'postfix') tree = buildFromPostfix(tokens);
  else tree = buildFromPrefix(tokens);
  const post = postorder(tree), pre = preorder(tree);
  const vars = [];
  for (const t of tokens) if (t.type === 'VAR' && !vars.includes(t.text)) vars.push(t.text);
  return { tokens, tree, post, pre, infix: toInfix(tree), convSteps, vars };
}

/* ======================================================================
   PART 2: USER INTERFACE (input, notations, value, stack trace, tree)
   ====================================================================== */
(function () {
  var DEFAULTS = { a: 2, b: 3, c: 5, d: 2, x: 4, y: 3 };
  var EXAMPLES = [
    { m: 'infix', t: '(a+b)*c-4^2/d' },
    { m: 'infix', t: '-2^2+10%3' },
    { m: 'infix', t: '3+4*2/(1-5)^2^3' },
    { m: 'postfix', t: '3 4 + 2 *' },
    { m: 'prefix', t: '- * 2 3 ~ 4' }
  ];
  var MODES = [['infix', 'Infix'], ['postfix', 'Postfix'], ['prefix', 'Prefix']];
  var HINTS = {
    infix: 'e.g. (a+b)*c-4^2/d',
    postfix: 'tokens separated by spaces, e.g. 3 4 + 2 *',
    prefix: 'tokens separated by spaces, e.g. * + 3 4 2'
  };
  var state = { mode: 'infix', text: EXAMPLES[0].t, vars: {}, tab: 'convert', step: 0 };
  var good = null, varKey = null, timer = null;

  function $(id) { return document.getElementById(id); }
  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      kids.forEach(function (kid) {
        if (kid == null || kid === false) return;
        el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
      });
    }
    return el;
  }
  var OPCLASS = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '^': 'pow', '%': 'mod', '~': 'neg' };
  function opClass(t) { return 'o-' + OPCLASS[t]; }
  function isOpTok(t) { return /^[+\-*\/%^~]$/.test(t); }
  // class suffix for a token's text: operator colour, variable colour or none
  function tokClass(t) {
    if (isOpTok(t)) return ' ' + opClass(t);
    if (/^[A-Za-z_]/.test(t)) return ' is-var';
    return '';
  }
  function colorize(s) {
    var f = document.createDocumentFragment();
    s.split(/([+\-*\/%^~])/).forEach(function (p) {
      if (!p) return;
      if (/^[+\-*\/%^~]$/.test(p)) f.append(h('span', { class: 'op ' + opClass(p), text: p }));
      else f.append(document.createTextNode(p));
    });
    return f;
  }
  function join(a) { return a.map(function (t) { return t.text; }).join(' '); }

  function stopPlay() {
    if (timer) { clearInterval(timer); timer = null; }
    $('b-play').classList.remove('playing');
    $('play-label').textContent = 'Play';
  }

  /* ---------- parse ---------- */
  function update(resetStep) {
    var p = null, err = '';
    if (!state.text.trim()) err = '';
    else {
      try { p = parse(state.text, state.mode); } catch (e) { err = e.message; }
    }
    if (p) {
      good = p;
      p.vars.forEach(function (v) {
        if (!(v in state.vars)) state.vars[v] = (v in DEFAULTS) ? DEFAULTS[v] : 1;
      });
    }
    state.error = err;
    state.empty = !state.text.trim();
    if (state.mode !== 'infix') state.tab = 'eval';
    if (resetStep) { state.step = 0; stopPlay(); }
    render();
  }

  /* ---------- evaluation ---------- */
  function computeEval() {
    if (!good) return { error: 'Nothing to evaluate yet' };
    try { return evaluate(state.mode === 'prefix' ? good.pre : good.post, state.vars, state.mode); }
    catch (e) { return { error: e.message }; }
  }

  /* ---------- render ---------- */
  function render() {
    var stale = !!state.error || state.empty;
    ['p-notations', 'p-value', 'p-trace', 'p-tree'].forEach(function (id) {
      $(id).classList.toggle('stale', stale && !!good);
    });
    var m = $('msg');
    m.className = 'msg' + (state.error ? ' err' : (state.empty ? '' : ' ok'));
    m.textContent = state.error || (state.empty ? 'Type an expression to begin.' : 'Valid expression.');
    $('expr').setAttribute('aria-invalid', state.error ? 'true' : 'false');
    $('modehint').textContent = HINTS[state.mode];
    Array.prototype.forEach.call($('modes').children, function (b) {
      b.setAttribute('aria-pressed', b.dataset.mode === state.mode ? 'true' : 'false');
    });
    renderTape();
    renderNotations();
    renderVars();
    renderValue();
    renderTabs();
    renderTrace();
    renderTree();
  }

  // live token strip under the input
  function renderTape() {
    var box = $('tape');
    box.replaceChildren();
    var toks = null;
    try { toks = tokenize(state.text, state.mode, state.mode !== 'infix' && !/\s/.test(state.text.trim())); } catch (e) { toks = null; }
    if (!toks) {
      box.append(h('span', { class: 'tape-empty', text: state.empty ? 'Your tokens appear here as you type.' : 'Fix the problem above to see the tokens.' }));
      return;
    }
    toks.forEach(function (t) {
      var cls = t.type === 'OP' ? opClass(t.text) : t.type === 'VAR' ? 'is-var' : t.type === 'NUM' ? 'is-num' : 'is-paren';
      box.append(h('span', { class: 'tk ' + cls, text: t.text }));
    });
  }

  function renderNotations() {
    var box = $('notations');
    box.replaceChildren();
    if (!good) { box.append(h('p', { class: 'empty-msg', text: 'The three notations appear here.' })); return; }
    var rows = [['Infix', good.infix], ['Postfix', join(good.post)], ['Prefix', join(good.pre)]];
    rows.forEach(function (r) {
      var val = h('div', { class: 'val' }, colorize(r[1]));
      var btn = h('button', { class: 'btn', text: 'Copy', onclick: function () { copy(r[1], val, btn); } });
      box.append(h('div', { class: 'nrow' }, h('div', { class: 'name', text: r[0] }), val, btn));
    });
  }
  function copy(text, el, btn) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1200); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(el);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'Selected'; setTimeout(function () { btn.textContent = 'Copy'; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function renderVars() {
    var names = good ? good.vars : [];
    var key = names.join(',');
    if (key === varKey) return;
    varKey = key;
    var box = $('vars');
    box.replaceChildren();
    if (!names.length) { box.append(h('p', { class: 'novars', text: 'No variables. Use letters like a or x1 to try them.' })); return; }
    names.forEach(function (n) {
      var inp = h('input', { id: 'var-' + n, type: 'number', step: 'any', inputmode: 'decimal', value: String(state.vars[n]) });
      inp.addEventListener('input', function () {
        var v = parseFloat(inp.value);
        state.vars[n] = isNaN(v) ? NaN : v;
        renderValue();
        if (state.tab === 'eval' || state.mode !== 'infix') renderTrace();
      });
      box.append(h('div', { class: 'var' }, h('label', { for: 'var-' + n, text: n }), inp));
    });
  }

  function renderValue() {
    var el = $('value');
    var r = computeEval();
    if (r.error) { el.className = 'value bad'; el.textContent = r.error; }
    else { el.className = 'value'; el.textContent = fmtNum(r.value); }
  }

  function renderTabs() {
    var t = $('tabs');
    t.replaceChildren();
    var defs = [];
    if (state.mode === 'infix') defs.push(['convert', 'Infix to postfix']);
    defs.push(['eval', 'Evaluation']);
    defs.forEach(function (d) {
      t.append(h('button', {
        class: 'tab', role: 'tab', 'aria-selected': state.tab === d[0] ? 'true' : 'false', text: d[1],
        onclick: function () { state.tab = d[0]; state.step = 0; stopPlay(); renderTabs(); renderTrace(); }
      }));
    });
  }

  function currentSteps() {
    if (!good) return { steps: [], kind: 'convert' };
    if (state.tab === 'convert' && state.mode === 'infix' && good.convSteps) return { steps: good.convSteps, kind: 'convert' };
    var ev = computeEval();
    if (ev.error) return { steps: [], kind: 'eval', error: ev.error };
    return { steps: ev.steps, kind: 'eval' };
  }

  function stackBox(items, kind) {
    var box = h('div', { class: 'stackbox' });
    if (!items.length) box.append(h('div', { class: 'empty', text: 'empty' }));
    items.slice().reverse().forEach(function (txt, i) {
      var cls = kind === 'convert' ? tokClass(txt) : ' is-num';
      box.append(h('div', { class: 'cell tk' + cls + (i === 0 ? ' top enter' : ''), text: txt }));
    });
    return h('div', null, h('div', { class: 'stackcap', text: kind === 'convert' ? 'Operator stack' : 'Value stack' }), box);
  }

  function renderTrace() {
    var cs = currentSteps(), steps = cs.steps, body = $('trace-body');
    body.replaceChildren();
    var multi = steps.length > 0;
    ['b-reset', 'b-back', 'b-play', 'b-next', 'range'].forEach(function (id) { $(id).disabled = !multi; });
    if (!multi) {
      $('range').max = 0; $('range').value = 0; $('count').textContent = '';
      body.append(h('p', { class: 'empty-msg', text: cs.error || 'Enter a valid expression to see the steps.' }));
      return;
    }
    state.step = Math.max(0, Math.min(state.step, steps.length - 1));
    var s = steps[state.step], prev = state.step ? steps[state.step - 1] : null;
    $('range').max = steps.length - 1;
    $('range').value = state.step;
    $('count').textContent = 'Step ' + (state.step + 1) + ' of ' + steps.length;
    $('b-back').disabled = state.step === 0;
    $('b-next').disabled = state.step === steps.length - 1;

    var right;
    if (cs.kind === 'convert') {
      var prevLen = prev ? prev.out.length : 0;
      var out = h('div', { class: 'outline' });
      if (!s.out.length) out.append(h('span', { class: 'empty-msg', text: 'nothing yet' }));
      s.out.forEach(function (t, i) { out.append(h('span', { class: 'oc tk' + tokClass(t) + (/^[0-9.]/.test(t) ? ' is-num' : '') + (i >= prevLen ? ' new' : ''), text: t })); });
      right = h('div', null, h('div', { class: 'stackcap', text: 'Postfix output so far' }), out);
    } else {
      right = h('div', null, h('div', { class: 'stackcap', text: 'Reading' }),
        h('div', { class: 'outline' }, h('span', { class: 'oc tk new' + tokClass(s.tok) + (/^[0-9.]/.test(s.tok) ? ' is-num' : ''), text: s.tok })));
    }
    body.append(h('div', { class: 'view' }, stackBox(s.stack, cs.kind), right));
    body.append(h('p', { class: 'note' }, h('b', { text: s.tok === 'end' ? 'End' : s.tok }), ' ' + (s.tok === 'end' ? '' : '') + s.note));

    var head = cs.kind === 'convert' ? ['Token', 'Stack (bottom to top)', 'Output'] : ['Token', 'Stack (bottom to top)', 'What happened'];
    var tbody = h('tbody');
    steps.forEach(function (st, i) {
      var tr = h('tr', { class: i === state.step ? 'cur' : (i > state.step ? 'future' : ''), tabindex: '0', 'aria-current': i === state.step ? 'step' : null });
      var go = function () { state.step = i; stopPlay(); renderTrace(); };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      tr.append(h('td', { class: 'tk-col' }, h('span', { class: 'tk' + tokClass(st.tok) + (/^[0-9.]/.test(st.tok) ? ' is-num' : ''), text: st.tok })), h('td', { class: 'wide', text: st.stack.join(' ') || '–' }),
        h('td', { class: 'wide', text: cs.kind === 'convert' ? (st.out.join(' ') || '–') : st.note }));
      tbody.append(tr);
    });
    var wrap = h('div', { class: 'tablewrap' }, h('table', null,
      h('thead', null, h('tr', null, head.map(function (t) { return h('th', { text: t }); }))), tbody));
    body.append(wrap);
    var cur = tbody.children[state.step];
    if (cur) wrap.scrollTop = Math.max(0, cur.offsetTop - wrap.clientHeight / 2);
  }

  /* ---------- tree ---------- */
  function renderTree() {
    var box = $('tree');
    box.replaceChildren();
    if (!good) { box.append(h('p', { class: 'empty-msg', text: 'The tree appears once the expression is valid.' })); return; }
    var c = 0, maxD = 0, nodes = [];
    (function walk(n, d) {
      if (!n) return;
      var unary = n.tok.type === 'OP' && n.tok.text === '~';
      if (unary) { n.x = c++; n.d = d; nodes.push(n); if (d > maxD) maxD = d; walk(n.left, d + 1); return; }
      walk(n.left, d + 1);
      n.x = c++; n.d = d; nodes.push(n); if (d > maxD) maxD = d;
      walk(n.right, d + 1);
    })(good.tree, 0);
    var CW = 56, RH = 66, PAD = 24, R = 20;
    var W = c * CW + PAD * 2, H = maxD * RH + 30 * 2;
    var px = function (n) { return PAD + n.x * CW + CW / 2; };
    var py = function (n) { return 30 + n.d * RH; };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Expression tree">';
    nodes.forEach(function (n) {
      [n.left, n.right].forEach(function (ch) {
        if (ch) svg += '<line class="edge" x1="' + px(n) + '" y1="' + py(n) + '" x2="' + px(ch) + '" y2="' + py(ch) + '"/>';
      });
    });
    nodes.forEach(function (n) {
      var t = n.tok.text;
      var cls = n.tok.type === 'OP' ? opClass(t) : n.tok.type === 'VAR' ? 'is-var' : '';
      var label = t === '~' ? 'neg' : t;
      var small = label.length > 3;
      svg += '<circle class="tn ' + cls + '" cx="' + px(n) + '" cy="' + py(n) + '" r="' + R + '"/>';
      svg += '<text class="' + cls + '" x="' + px(n) + '" y="' + py(n) + '"' + (small ? ' style="font-size:10px"' : '') + '>' + label.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
    });
    svg += '</svg>';
    box.innerHTML = svg;
    box.scrollLeft = Math.max(0, (box.scrollWidth - box.clientWidth) / 2);  // start centred on the root
  }

  /* ---------- wiring ---------- */
  MODES.forEach(function (m) {
    $('modes').append(h('button', {
      type: 'button', 'data-mode': m[0], 'aria-pressed': 'false', text: m[1],
      onclick: function () {
        if (state.mode === m[0]) return;
        // re-express the current expression in the new notation
        if (good && !state.error) {
          state.text = m[0] === 'infix' ? good.infix : m[0] === 'postfix' ? join(good.post) : join(good.pre);
          $('expr').value = state.text;
        }
        state.mode = m[0];
        state.tab = m[0] === 'infix' ? 'convert' : 'eval';
        good = null; varKey = null;
        update(true);
      }
    }));
  });
  EXAMPLES.forEach(function (ex) {
    $('examples').append(h('button', {
      type: 'button', class: 'chip', text: ex.t,
      onclick: function () {
        state.mode = ex.m; state.text = ex.t; state.tab = ex.m === 'infix' ? 'convert' : 'eval';
        $('expr').value = ex.t; good = null; varKey = null; update(true);
      }
    }));
  });
  $('expr').value = state.text;
  $('expr').addEventListener('input', function (e) { state.text = e.target.value; update(true); });

  $('b-reset').addEventListener('click', function () { state.step = 0; stopPlay(); renderTrace(); });
  $('b-back').addEventListener('click', function () { state.step--; stopPlay(); renderTrace(); });
  $('b-next').addEventListener('click', function () { state.step++; stopPlay(); renderTrace(); });
  $('range').addEventListener('input', function (e) { state.step = parseInt(e.target.value, 10); stopPlay(); renderTrace(); });
  $('b-play').addEventListener('click', function () {
    if (timer) { stopPlay(); return; }
    var total = currentSteps().steps.length;
    if (!total) return;
    if (state.step >= total - 1) state.step = 0;
    $('b-play').classList.add('playing');
    $('play-label').textContent = 'Pause';
    renderTrace();
    timer = setInterval(function () {
      var n = currentSteps().steps.length;
      if (state.step >= n - 1) { stopPlay(); return; }
      state.step++;
      renderTrace();
      if (state.step >= n - 1) stopPlay();
    }, 900);
  });

  update(true);
})();