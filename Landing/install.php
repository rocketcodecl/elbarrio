<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/bootstrap.php';

if (app_is_installed()) redirect_to('admin/login.php');

$errors = [];
$success = false;
if (request_method() === 'POST') {
    $token = is_string($_POST['csrf_token'] ?? null) ? $_POST['csrf_token'] : '';
    if (!hash_equals($_SESSION['install_csrf'] ?? '', $token)) $errors[] = 'Formulario expirado.';
    $host = trim((string) ($_POST['db_host'] ?? 'localhost'));
    $port = (int) ($_POST['db_port'] ?? 3306);
    $database = trim((string) ($_POST['db_name'] ?? ''));
    $username = trim((string) ($_POST['db_user'] ?? ''));
    $password = (string) ($_POST['db_password'] ?? '');
    $adminName = trim((string) ($_POST['admin_name'] ?? ''));
    $adminEmail = mb_strtolower(trim((string) ($_POST['admin_email'] ?? '')));
    $adminPassword = (string) ($_POST['admin_password'] ?? '');

    if ($database === '' || $username === '') $errors[] = 'Completa los datos de la base de datos.';
    if (mb_strlen($adminName) < 2) $errors[] = 'Ingresa el nombre del administrador.';
    if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) $errors[] = 'Correo administrativo inválido.';
    if (strlen($adminPassword) < 12) $errors[] = 'La contraseña debe tener al menos 12 caracteres.';

    if (!$errors) {
        try {
            $pdo = new PDO(
                "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
                $username,
                $password,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
            );
            $schema = file_get_contents(__DIR__ . '/install/schema.sql');
            if ($schema === false) throw new RuntimeException('No se encontró install/schema.sql.');
            $pdo->exec($schema);
            $stmt = $pdo->prepare(
                "INSERT INTO users (name,email,password_hash,role,status,created_at,updated_at)
                 VALUES (:name,:email,:hash,'administrator','active',NOW(),NOW())
                 ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role='administrator', status='active'"
            );
            $stmt->execute(['name'=>$adminName,'email'=>$adminEmail,'hash'=>password_hash($adminPassword, PASSWORD_DEFAULT)]);
            $config = "<?php\nreturn " . var_export([
                'host'=>$host,'port'=>$port,'database'=>$database,'username'=>$username,
                'password'=>$password,'charset'=>'utf8mb4'
            ], true) . ";\n";
            if (file_put_contents(DATABASE_CONFIG_FILE, $config, LOCK_EX) === false) {
                throw new RuntimeException('No se pudo escribir config/database.php.');
            }
            if (file_put_contents(INSTALL_LOCK_FILE, date('c')."\n", LOCK_EX) === false) {
                throw new RuntimeException('No se pudo crear config/installed.lock.');
            }
            foreach ([UPLOADS_PATH . '/media', LOGS_PATH, CACHE_PATH, BACKUPS_PATH] as $dir) {
                if (!is_dir($dir)) mkdir($dir, 0775, true);
            }
            $success = true;
        } catch (Throwable $e) {
            @unlink(DATABASE_CONFIG_FILE);
            @unlink(INSTALL_LOCK_FILE);
            $errors[] = APP_DEBUG ? $e->getMessage() : 'No fue posible completar la instalación. Revisa las credenciales y permisos.';
        }
    }
}
try { $_SESSION['install_csrf'] = bin2hex(random_bytes(24)); } catch (Throwable) { $_SESSION['install_csrf'] = sha1(uniqid('', true)); }
?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instalar El Barrio</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4efe6;color:#17211c;font-family:system-ui,sans-serif}
main{width:min(100%,760px);background:#fff;border:1px solid #ded6c9;border-radius:28px;padding:clamp(24px,6vw,50px);box-shadow:0 25px 70px #17211c22}
h1{font-size:clamp(2.3rem,7vw,4.5rem);line-height:.95;letter-spacing:-.06em;margin:0}p{color:#68736c;line-height:1.6}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{display:grid;gap:7px}.wide{grid-column:1/-1}
label{font-weight:750;font-size:.85rem}input{width:100%;border:1px solid #ded6c9;border-radius:13px;padding:13px;font:inherit}
button,a.button{display:inline-flex;justify-content:center;align-items:center;border:0;border-radius:999px;padding:14px 22px;background:#245b45;color:#fff;font-weight:800;text-decoration:none;cursor:pointer}
.alert{padding:14px;border-radius:13px;background:#a43b3512;color:#7c2e29;margin:18px 0}.ok{background:#245b4512;color:#173d2e}
@media(max-width:650px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}}</style></head><body><main>
<p><strong>EL BARRIO · INSTALADOR</strong></p><h1>Tu sitio queda listo en minutos.</h1>
<?php if ($success): ?><div class="alert ok">Instalación completada correctamente.</div><a class="button" href="<?= e(relative_url('admin/login.php')) ?>">Entrar al panel</a>
<?php else: ?><p>Ingresa la base de datos creada en Plesk y define tu cuenta administrativa.</p>
<?php if($errors): ?><div class="alert"><?= e(implode(' ', $errors)) ?></div><?php endif ?>
<form method="post"><input type="hidden" name="csrf_token" value="<?= e($_SESSION['install_csrf']) ?>"><div class="grid">
<div class="field"><label>Host</label><input name="db_host" value="<?= e($_POST['db_host'] ?? 'localhost') ?>" required></div>
<div class="field"><label>Puerto</label><input name="db_port" type="number" value="<?= e($_POST['db_port'] ?? '3306') ?>" required></div>
<div class="field"><label>Base de datos</label><input name="db_name" value="<?= e($_POST['db_name'] ?? '') ?>" required></div>
<div class="field"><label>Usuario DB</label><input name="db_user" value="<?= e($_POST['db_user'] ?? '') ?>" required></div>
<div class="field wide"><label>Contraseña DB</label><input name="db_password" type="password"></div>
<div class="field"><label>Tu nombre</label><input name="admin_name" value="<?= e($_POST['admin_name'] ?? '') ?>" required></div>
<div class="field"><label>Tu correo</label><input name="admin_email" type="email" value="<?= e($_POST['admin_email'] ?? '') ?>" required></div>
<div class="field wide"><label>Contraseña administrativa (12+)</label><input name="admin_password" type="password" required></div>
<div class="wide"><button type="submit">Instalar El Barrio</button></div>
</div></form><?php endif ?></main></body></html>
