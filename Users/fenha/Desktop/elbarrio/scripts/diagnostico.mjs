// Diagnóstico oficial del proyecto El Barrio
// Ejecutar: node scripts/diagnostico.mjs

const SUPABASE_URL = 'https://mpecgsiidswcxjrlafkz.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZWNnc2lpZHN3Y3hqcmxhZmt6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY5NDA2MywiZXhwIjoyMDk5MjcwMDYzfQ.ZMoppclhL2pb0AZTmMwL0YL8BJ0VnhSTK2HHrKr75h8';

const headers = {
  'apikey': SERVICE_ROLE,
  'Authorization': 'Bearer ' + SERVICE_ROLE,
  'Content-Type': 'application/json',
};

const TABLAS_ESPERADAS = [
  'profiles', 'posts', 'notifications', 'commerces',
  'commerce_products', 'farmacias', 'incidents',
  'service_reviews', 'comments', 'news_categories',
  'event_ticket_prices', 'event_attendees',
  'notification_campaigns', 'user_admin_actions',
  'incident_admin_actions', 'neighborhoods'
];

const FUNCIONES_ESPERADAS = [
  'admin_send_notification',
  'admin_send_broadcast_notification',
  'admin_notification_audience_counts',
  'admin_list_notification_campaigns',
  'admin_manage_profile',
  'admin_moderate_incident',
  'admin_get_user_activity',
  'user_delete_notification',
  'barrio_en_punto_mvp'
];

async function consultar(sql) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({}),
  });
  // No podemos ejecutar SQL directo via REST, así que consultamos pg_catalog vía GET
  return null;
}

// Consultamos information_schema vía REST (solo lectura)
async function tablasExistentes() {
  const resultados = {};
  for (const tabla of TABLAS_ESPERADAS) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=id&limit=1`, { headers });
      if (r.ok || r.status === 406) {
        resultados[tabla] = '✅ existe';
      } else if (r.status === 404) {
        resultados[tabla] = '❌ NO EXISTE';
      } else {
        const t = await r.text();
        resultados[tabla] = `❓ status ${r.status}`;
      }
    } catch (e) {
      resultados[tabla] = `❌ error: ${e.message}`;
    }
  }
  return resultados;
}

async function funcionesExistentes() {
  const resultados = {};
  for (const fn of FUNCIONES_ESPERADAS) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'params=single' },
        body: '{}',
      });
      const status = r.status;
      if (status === 200) {
        resultados[fn] = '✅ existe y responde';
      } else if (status === 400) {
        const text = await r.text();
        if (text.includes('function') && text.includes('not found')) {
          resultados[fn] = '❌ NO EXISTE';
        } else {
          resultados[fn] = '✅ existe (falla por parámetros, esperado)';
        }
      } else if (status === 401) {
        resultados[fn] = '✅ existe (requiere auth de admin)';
      } else if (status === 404) {
        const text = await r.text();
        if (text.includes('function') || text.includes('not found')) {
          resultados[fn] = '❌ NO EXISTE';
        } else {
          resultados[fn] = `❓ status ${status}`;
        }
      } else {
        const text = await r.text();
        if (text.includes('function') && !text.includes('permission')) {
          resultados[fn] = '❌ NO EXISTE';
        } else {
          resultados[fn] = `❓ status ${status}: ${text.substring(0, 80)}`;
        }
      }
    } catch (e) {
      resultados[fn] = `❌ error: ${e.message}`;
    }
  }
  return resultados;
}

async function main() {
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  DIAGNÓSTICO OFICIAL - EL BARRIO');
  console.log('══════════════════════════════════════');
  console.log('  Fecha: ' + new Date().toLocaleString('es-CL'));
  console.log('');

  console.log('📦 TABLAS');
  console.log('──────────────────────────────────────');
  const tablas = await tablasExistentes();
  for (const [nombre, estado] of Object.entries(tablas)) {
    console.log(`  ${estado.padEnd(25)} ${nombre}`);
  }

  console.log('');
  console.log('🔧 FUNCIONES RPC');
  console.log('──────────────────────────────────────');
  const funciones = await funcionesExistentes();
  for (const [nombre, estado] of Object.entries(funciones)) {
    console.log(`  ${estado.padEnd(45)} ${nombre}`);
  }

  console.log('');
  console.log('══════════════════════════════════════');
  const totalTablas = Object.values(tablas).filter(v => v.includes('✅')).length;
  const totalFunciones = Object.values(funciones).filter(v => v.includes('✅')).length;
  const fallanTablas = Object.values(tablas).filter(v => v.includes('❌')).length;
  const fallanFunciones = Object.values(funciones).filter(v => v.includes('❌')).length;
  
  console.log(`  ✅ ${totalTablas}/${TABLAS_ESPERADAS.length} tablas existentes`);
  console.log(`  ✅ ${totalFunciones}/${FUNCIONES_ESPERADAS.length} funciones existentes`);
  if (fallanTablas > 0 || fallanFunciones > 0) {
    console.log(`  ❌ ${fallanTablas} tabla(s) faltante(s), ${fallanFunciones} función(es) faltante(s)`);
  } else {
    console.log('  🎯 Todo correcto. No hay nada pendiente.');
  }
  console.log('══════════════════════════════════════');
  console.log('');
}

main().catch(e => console.error('Error fatal:', e.message));