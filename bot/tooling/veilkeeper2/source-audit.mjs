import {parse} from 'acorn';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
export function walk(node, visit, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') {
    visit(node, ancestors);
    ancestors = [...ancestors, node];
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc') continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit, ancestors);
    else if (value && typeof value === 'object') walk(value, visit, ancestors);
  }
}
export function analyzeModule(file, source, files) {
  const ast = parse(source, {ecmaVersion:'latest', sourceType: file.endsWith('.cjs') ? 'script' : 'module', locations:true, allowHashBang:true});
  const result = {file, sha256:hash(source), functions:[], exports:[], imports:[], calls:[], registrations:[], sql:[]};
  const names = new Map();
  const label = node => node?.name ?? node?.value ?? null;
  const expression = node => node ? source.slice(node.start,node.end) : '';
  walk(ast, (node, ancestors) => {
    const parent = ancestors.at(-1);
    const line = node.loc.start.line;
    if (functionTypes.has(node.type)) {
      const name = node.id?.name ?? (parent?.type === 'VariableDeclarator' ? label(parent.id) : label(parent?.key)) ?? `<anonymous@${line}:${node.loc.start.column}>`;
      const id = `${file}:${line}:${node.loc.start.column}`;
      names.set(node,id);
      result.functions.push({id,name,line,end:node.loc.end.line,kind:node.type,sha256:hash(expression(node))});
    }
    if (node.type.startsWith('Export')) result.exports.push({line,kind:node.type,source:node.source?.value ?? null,text:expression(node).slice(0,300)});
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source) || node.type === 'ImportExpression' || (node.type === 'CallExpression' && node.callee.name === 'require')) {
      const raw = node.source ?? node.arguments?.[0];
      const specifier = raw?.type === 'Literal' && typeof raw.value === 'string' ? raw.value : null;
      let target = null;
      let status = specifier ? 'external' : 'dynamic-unresolved';
      if (specifier?.startsWith('.')) {
        const joined = path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
        target = [joined, `${joined}.js`, `${joined}.mjs`, `${joined}/index.js`].find(p=>files.has(p)) ?? null;
        status = target ? 'resolved' : 'missing';
      }
      result.imports.push({line,kind:node.type,specifier,target,status,expression:specifier ? undefined : expression(raw)});
    }
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      const callee = expression(node.callee);
      const enclosing = [...ancestors].reverse().find(n=>functionTypes.has(n.type));
      result.calls.push({line,from:enclosing ? names.get(enclosing) : `${file}:module`,callee,resolution:'unresolved-static-callsite'});
      if (/register|\.setName$/.test(callee)) result.registrations.push({line,callee,arguments:node.arguments.map(expression)});
    }
    if ((node.type === 'Literal' && typeof node.value === 'string') || node.type === 'TemplateLiteral') {
      const text = node.type === 'Literal' ? node.value : node.quasis.map(q=>q.value.cooked ?? q.value.raw).join('${EXPRESSION}');
      if (/\b(?:SELECT\b.+\bFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE|ALTER\s+TABLE|DELETE\s+FROM|PRAGMA)\b/is.test(text)) result.sql.push({line,text,dynamic:node.type === 'TemplateLiteral' && node.expressions.length>0});
    }
  });
  return result;
}

export function verifyReferences(handoff, read) {
  const refs = [];
  const pattern = /https:\/\/github\.com\/KeshireTheChaotic\/Veiled_City\/blob\/([a-f0-9]{40})\/([^\s)#]+)(?:#L(\d+)(?:-L(\d+))?)?/g;
  const seen = new Set();
  for (const match of handoff.matchAll(pattern)) {
    if (seen.has(match[0])) continue;
    seen.add(match[0]);
    const [,commit,file,first,last] = match;
    const record = {commit,file,start:first ? Number(first) : null,end:last ? Number(last) : first ? Number(first) : null};
    try {
      const source = read(file);
      const lines = source.split(/\r?\n/);
      if (lines.at(-1) === '') lines.pop();
      record.fileSha256 = hash(source);
      record.lineCount = lines.length;
      record.rangeValid = !record.start || (record.start >= 1 && record.end >= record.start && record.end <= lines.length);
      if (record.rangeValid && record.start) record.rangeSha256 = hash(lines.slice(record.start-1,record.end).join('\n'));
      record.status = record.rangeValid ? 'range-exists-semantic-review-required' : 'invalid-range';
    } catch (error) { record.status = 'missing-file'; record.error = error.message; }
    refs.push(record);
  }
  return refs;
}

// A candidate destination is a review obligation, never permission to delete.
export function destination(file) {
  if (/frameworks\/daggerheart\//.test(file)) return {fate:'port',destination:'v2/rules',gate:'R3 mechanical parity'};
  if (/frameworks\/persistence\//.test(file)) return {fate:'port',destination:'v2/persistence',gate:'R7 semantic migration'};
  if (/frameworks\/(knowledge|npc|content)\//.test(file)) return {fate:'port',destination:'v2/knowledge-context',gate:'R2 source and knowledge authority'};
  if (/frameworks\/discord\//.test(file) || /commands?/.test(file)) return {fate:'port',destination:'v2/transport',gate:'R6 command compatibility'};
  if (/frameworks\/ai-provider\//.test(file)) return {fate:'port',destination:'v2/transport',gate:'R4 provider behavior'};
  if (/frameworks\/(narrative|intent)\/|\/gm\.js$|\/pvp-output\.js$|\/turn-orchestration\.js$/.test(file)) return {fate:'replace',destination:'v2/gm-kernel-publication',gate:'R4 and R8 replacement coverage'};
  if (/frameworks\/(world|session)\//.test(file)) return {fate:'port',destination:'v2/world-app',gate:'R5-R6 authority and continuity'};
  if (/application\/composition|framework-to-framework/.test(file)) return {fate:'replace',destination:'v2/app composition',gate:'R8 zero consumers'};
  return {fate:'retain',destination:'baseline pending individual review',gate:'R0 explicit symbol disposition required'};
}
