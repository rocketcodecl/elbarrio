import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '..', 'supabase', 'migrations');

console.log('');
console.log('========================================');
console.log('  DIAGNOSTICO OFICIAL - EL BARRIO');
console.log('========================================');
console.log('');
console.log('Leyendo migraciones desde: ' + MIGRATIONS_DIR);
console.log('');

let pendientes = [];
let aplicadas = [];
let totalFunciones = new Set();
let totalTablas = new Set();

const files = readdirSync(MIGRATIONS_DIR).sort();
for (const file of files) {
  if (!file.endsWith('.sql')) continue;
  const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
  
  // Extraer CREATE TABLE
  const createTables = content.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi) || [];
  for (const ct of createTables) {
    const match = ct.match(/public\.(\w+)/);
    if (match) totalTablas.add(match[1]);
  }
  
  // Extraer CREATE FUNCTION
  const createFuncs = content.match(/create\s+or\s+replace\s+function\s+public\.(\w+)/gi) || [];
  for (const cf of createFuncs) {
    const match = cf.match(/public\.(\w+)/);
    if (match) totalFunciones.add(match[1]);
  }
}

console.log('Tablas definidas en migraciones:');
for (const t of [...totalTablas].sort()) {
  console.log('  ' + t);
}
console.log('');
console.log('Funciones definidas en migraciones:');
for (const f of [...totalFunciones].sort()) {
  console.log('  ' + f);
}

console.log('');
console.log('========================================');
console.log('  Para verificar contra Supabase:');
console.log('========================================');
console.log('');
console.log('Pega esto en el SQL Editor de Supabase:');
console.log('');
console.log('  -- Verificar tablas');
console.log('  SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'');
console.log('    AND table_name IN (');
const tArr = [...totalTablas].sort();
for (let i = 0; i < tArr.length; i++) {
  const comma = i < tArr.length - 1 ? ',' : '';
  console.log('      \'' + tArr[i] + '\'' + comma);
}
console.log('    );');
console.log('');
console.log('  -- Verificar funciones');
console.log('  SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace');
console.log('  WHERE n.nspname = \'public\' AND p.proname IN (');
const fArr = [...totalFunciones].sort();
for (let i = 0; i < fArr.length; i++) {
  const comma = i < fArr.length - 1 ? ',' : '';
  console.log('      \'' + fArr[i] + '\'' + comma);
}
console.log('    );');
console.log('');
console.log('========================================');
