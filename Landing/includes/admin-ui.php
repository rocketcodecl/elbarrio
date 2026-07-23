<?php
declare(strict_types=1);
function admin_top(string $title, string $active): void {
    $user = auth_user(); ?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title><?= e($title) ?> | <?= e(APP_NAME) ?></title>
<style>
:root{--ink:#17211c;--muted:#68736c;--paper:#f5f1e9;--surface:#fff;--line:#e1dace;--green:#245b45;--dark:#173d2e;--soft:#e8f0eb;--danger:#a43b35}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,sans-serif}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}
.shell{display:grid;min-height:100vh;grid-template-columns:230px 1fr}.side{padding:24px 18px;background:var(--dark);color:#fff}.brand{display:block;font-size:1.2rem;font-weight:900;margin:8px 10px 28px}.nav{display:grid;gap:5px}.nav a{padding:12px;border-radius:11px;color:#ffffffb3;font-weight:700}.nav a:hover,.nav a.on{background:#ffffff16;color:#fff}
.main{min-width:0;padding:30px}.head{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:24px}.head h1{margin:0;font-size:clamp(2rem,5vw,3rem);letter-spacing:-.055em}.head p{margin:6px 0 0;color:var(--muted)}
.panel{background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 18px 50px #17211c10;overflow:hidden}.pad{padding:20px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
input,select,textarea{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:#fff}.field{display:grid;gap:7px}.field label{font-weight:750;font-size:.84rem}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.wide{grid-column:1/-1}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border:1px solid var(--line);border-radius:999px;padding:0 16px;background:#fff;font-weight:800;cursor:pointer}.primary{background:var(--green);border-color:var(--green);color:#fff}.danger{color:var(--danger);background:#a43b3508}
table{width:100%;border-collapse:collapse}th,td{padding:14px 18px;text-align:left;border-top:1px solid var(--line);vertical-align:top}th{border-top:0;color:var(--muted);font-size:.72rem;text-transform:uppercase}.badge{display:inline-flex;padding:5px 9px;border-radius:999px;background:var(--soft);color:var(--green);font-size:.72rem;font-weight:800}
.alert{padding:13px 15px;border-radius:13px;margin-bottom:18px;background:var(--soft);color:var(--dark)}.error{background:#a43b3510;color:#782b27}.actions{display:flex;gap:7px;flex-wrap:wrap}.empty{padding:32px;text-align:center;color:var(--muted)}
@media(max-width:780px){.shell{grid-template-columns:1fr}.side{position:static}.main{padding:20px 14px}.grid{grid-template-columns:1fr}.wide{grid-column:auto}.head{align-items:flex-start;flex-direction:column}.panel{overflow:auto}}</style></head><body><div class="shell"><aside class="side"><a class="brand" href="<?= e(relative_url('admin/')) ?>">EL BARRIO</a><nav class="nav">
<?php foreach(['index'=>'Resumen','pages'=>'Páginas','content'=>'Contenido','media'=>'Multimedia','messages'=>'Mensajes','subscribers'=>'Suscriptores','settings'=>'Configuración'] as $key=>$label): ?>
<a class="<?= $active===$key?'on':'' ?>" href="<?= e(relative_url('admin/'.($key==='index'?'':$key.'.php'))) ?>"><?= e($label) ?></a>
<?php endforeach ?><a href="<?= e(relative_url('admin/logout.php')) ?>">Cerrar sesión</a></nav></aside><main class="main"><header class="head"><div><h1><?= e($title) ?></h1><p><?= e($user['name'] ?? 'Administrador') ?> · <?= e($user['role'] ?? '') ?></p></div><a class="btn" target="_blank" rel="noopener" href="<?= e(relative_url('')) ?>">Ver sitio</a></header>
<?php }
function admin_bottom(): void { echo '</main></div></body></html>'; }
