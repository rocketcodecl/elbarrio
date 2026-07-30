const supabaseUrl = 'https://mpecgsiidswcxjrlafkz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZWNnc2lpZHN3Y3hqcmxhZmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTQwNjMsImV4cCI6MjA5OTI3MDA2M30.rlbOaU_CnePUKSEGfh9B55CSTWsjkke5TX1EUbCeVo8';

const headers = {
  'apikey': supabaseAnonKey,
  'Authorization': 'Bearer ' + supabaseAnonKey,
};

async function main() {
  const knownTables = [
    'profiles', 'posts', 'notifications', 'commerces',
    'commerce_products', 'farmacias', 'incidents',
    'service_reviews', 'comments', 'news_categories',
    'event_ticket_prices', 'event_attendees',
    'notification_campaigns', 'user_admin_actions',
    'incident_admin_actions'
  ];
  
  console.log('=== Checking tables ===');
  for (const table of knownTables) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count&limit=1`, { headers });
      if (r.ok) console.log(`  ✅ ${table}`);
      else if (r.status === 404) console.log(`  ❌ ${table} NOT FOUND`);
      else if (r.status === 406) console.log(`  ⚠️  ${table} exists (empty/no access)`);
      else {
        const t = await r.text();
        console.log(`  ❓ ${table} status ${r.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${table} error`);
    }
  }

  console.log('\n=== Checking RPC functions ===');
  const rpcs = [
    'admin_moderate_incident', 'admin_manage_profile',
    'admin_send_notification', 'admin_get_user_activity',
    'admin_notification_broadcast', 'barrio_en_punto_mvp',
    'user_delete_notification'
  ];
  for (const rpc of rpcs) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpc}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (r.status === 200) console.log(`  ✅ ${rpc}`);
      else if (r.status === 404) console.log(`  ❌ ${rpc} NOT FOUND`);
      else if (r.status === 400) {
        const t = await r.text();
        if (t.includes('function') || t.includes('parameters')) {
          console.log(`  ⚠️  ${rpc} exists (needs params)`);
        } else {
          console.log(`  ❓ ${rpc} exists (other error)`);
        }
      } else {
        console.log(`  ❓ ${rpc} status ${r.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${rpc} error`);
    }
  }

  console.log('\n=== profiles columns ===');
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*&limit=1`, { headers });
    if (r.ok) {
      const d = await r.json();
      if (d.length > 0) console.log('  Columns:', Object.keys(d[0]).join(', '));
      else console.log('  Table empty');
    }
  } catch(e) {
    console.log('  Error');
  }

  console.log('\n=== posts columns ===');
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/posts?select=*&limit=1`, { headers });
    if (r.ok) {
      const d = await r.json();
      if (d.length > 0) console.log('  Columns:', Object.keys(d[0]).join(', '));
      else console.log('  Table empty');
    }
  } catch(e) {
    console.log('  Error');
  }
}

main().catch(console.error);