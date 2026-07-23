<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/bootstrap.php';require_once dirname(__DIR__).'/includes/auth.php';require_once dirname(__DIR__).'/includes/admin-ui.php';
require_installation();auth_require_role(['administrator']);$notice='';$errors=[];
$fields=[
 'site_description'=>['Descripción del sitio','seo','text',1],
 'contact_email'=>['Correo de contacto','contact','string',1],
 'contact_phone'=>['Teléfono','contact','string',1],
 'social_instagram'=>['Instagram','social','string',1],
 'social_facebook'=>['Facebook','social','string',1],
 'maintenance_mode'=>['Modo mantenimiento (0/1)','system','boolean',0],
];
if(request_method()==='POST'){
 if(!auth_verify_csrf((string)($_POST['csrf_token']??'')))$errors[]='Formulario expirado.';
 else{foreach($fields as $key=>$meta){$value=trim((string)($_POST[$key]??''));db_execute('INSERT INTO settings(`key`,`value`,`type`,`group_name`,`is_public`,created_at,updated_at) VALUES(:key,:value,:type,:group,:public,NOW(),NOW()) ON DUPLICATE KEY UPDATE value=VALUES(value),type=VALUES(type),group_name=VALUES(group_name),is_public=VALUES(is_public),updated_at=NOW()',['key'=>$key,'value'=>$value,'type'=>$meta[2],'group'=>$meta[1],'public'=>$meta[3]]);}auth_log_activity('update_settings','settings',null,'Actualizó la configuración.');$notice='Configuración guardada.';}
}
$values=[];foreach(db_fetch_all('SELECT `key`,`value` FROM settings') as $r)$values[$r['key']]=$r['value'];admin_top('Configuración','settings');?>
<?php if($errors):?><div class="alert error"><?=e(implode(' ',$errors))?></div><?php endif?><?php if($notice):?><div class="alert"><?=e($notice)?></div><?php endif?>
<section class="panel pad"><form method="post"><input type="hidden" name="csrf_token" value="<?=e(auth_csrf_token())?>"><div class="grid"><?php foreach($fields as $key=>$meta):?><div class="field <?=$key==='site_description'?'wide':''?>"><label><?=e($meta[0])?></label><?php if($meta[2]==='text'):?><textarea name="<?=e($key)?>"><?=e($values[$key]??'')?></textarea><?php else:?><input name="<?=e($key)?>" value="<?=e($values[$key]??'')?>"><?php endif?></div><?php endforeach?><div class="wide"><button class="btn primary">Guardar configuración</button></div></div></form></section><?php admin_bottom();?>
