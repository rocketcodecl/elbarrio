<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/bootstrap.php'; require_once dirname(__DIR__).'/includes/auth.php'; require_once dirname(__DIR__).'/includes/admin-ui.php';
require_installation();auth_require_role(['administrator','editor','moderator']);$notice='';
if(request_method()==='POST'&&auth_verify_csrf((string)($_POST['csrf_token']??''))){
 $id=(int)($_POST['id']??0);$status=(string)($_POST['status']??'read');
 if(in_array($status,['new','read','replied','archived','spam'],true)){db_execute('UPDATE contact_messages SET status=:status,read_at=IF(:status="read" AND read_at IS NULL,NOW(),read_at),updated_at=NOW() WHERE id=:id',['status'=>$status,'id'=>$id]);$notice='Mensaje actualizado.';}
}
$filter=(string)($_GET['status']??'');$params=[];$sql='SELECT * FROM contact_messages';
if(in_array($filter,['new','read','replied','archived','spam'],true)){$sql.=' WHERE status=:status';$params['status']=$filter;}
$sql.=' ORDER BY created_at DESC LIMIT 300';$rows=db_fetch_all($sql,$params);admin_top('Mensajes','messages');?>
<?php if($notice):?><div class="alert"><?=e($notice)?></div><?php endif?><div class="toolbar"><?php foreach([''=>'Todos','new'=>'Nuevos','read'=>'Leídos','replied'=>'Respondidos','archived'=>'Archivados','spam'=>'Spam'] as $k=>$v):?><a class="btn" href="?status=<?=e($k)?>"><?=e($v)?></a><?php endforeach?></div>
<section class="panel"><table><thead><tr><th>Contacto</th><th>Mensaje</th><th>Estado</th><th>Fecha</th></tr></thead><tbody><?php foreach($rows as $r):?><tr><td><strong><?=e($r['name'])?></strong><br><a href="mailto:<?=e($r['email'])?>"><?=e($r['email'])?></a><?php if($r['phone']):?><br><?=e($r['phone'])?><?php endif?></td><td><strong><?=e($r['subject']?:'Sin asunto')?></strong><br><?=nl2br(e($r['message']))?></td><td><form method="post"><input type="hidden" name="csrf_token" value="<?=e(auth_csrf_token())?>"><input type="hidden" name="id" value="<?=e($r['id'])?>"><select name="status" onchange="this.form.submit()"><?php foreach(['new','read','replied','archived','spam'] as $s):?><option <?=$r['status']===$s?'selected':''?>><?=e($s)?></option><?php endforeach?></select></form></td><td><?=e(date('d/m/Y H:i',strtotime($r['created_at'])))?></td></tr><?php endforeach?><?php if(!$rows):?><tr><td colspan="4" class="empty">No hay mensajes.</td></tr><?php endif?></tbody></table></section><?php admin_bottom();?>
