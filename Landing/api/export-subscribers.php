<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/bootstrap.php';require_once dirname(__DIR__).'/includes/auth.php';require_installation();auth_require_role(['administrator','editor']);
header('Content-Type: text/csv; charset=UTF-8');header('Content-Disposition: attachment; filename="suscriptores-'.date('Y-m-d').'.csv"');
$out=fopen('php://output','wb');fwrite($out,"\xEF\xBB\xBF");fputcsv($out,['Nombre','Correo','Estado','Origen','Fecha']);
foreach(db_fetch_all('SELECT name,email,status,source,created_at FROM subscribers ORDER BY created_at DESC') as $r)fputcsv($out,[$r['name'],$r['email'],$r['status'],$r['source'],$r['created_at']]);
fclose($out);exit;
