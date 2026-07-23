<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/bootstrap.php'; require_once dirname(__DIR__).'/includes/auth.php'; require_once dirname(__DIR__).'/includes/admin-ui.php';
require_installation(); auth_require_role(['administrator','editor']);
$errors=[];$notice='';$user=auth_user();
if(request_method()==='POST'){
 if(!auth_verify_csrf((string)($_POST['csrf_token']??'')))$errors[]='Formulario expirado.';
 elseif(($_POST['action']??'')==='upload'){
  $f=$_FILES['file']??null;
  if(!is_array($f)||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)$errors[]='Selecciona una imagen válida.';
  else{
   $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);$allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'];
   if(!isset($allowed[$mime]))$errors[]='Formato no permitido.';
   elseif((int)$f['size']>8*1024*1024)$errors[]='Máximo 8 MB.';
   else{
    $name=bin2hex(random_bytes(16)).'.'.$allowed[$mime];$dir=UPLOADS_PATH.'/media';
    if(!is_dir($dir))mkdir($dir,0775,true);
    if(!move_uploaded_file($f['tmp_name'],$dir.'/'.$name))$errors[]='No se pudo guardar.';
    else{
     $dim=@getimagesize($dir.'/'.$name);
     db_execute('INSERT INTO media(disk,directory,filename,original_name,mime_type,extension,size_bytes,width,height,alt_text,uploaded_by,created_at,updated_at) VALUES("local","media",:filename,:original,:mime,:ext,:size,:width,:height,:alt,:uid,NOW(),NOW())',
      ['filename'=>$name,'original'=>mb_substr((string)$f['name'],0,255),'mime'=>$mime,'ext'=>$allowed[$mime],'size'=>(int)$f['size'],'width'=>$dim[0]??null,'height'=>$dim[1]??null,'alt'=>trim((string)($_POST['alt_text']??''))?:null,'uid'=>(int)$user['id']]);
     auth_log_activity('upload_media','media',(int)db_last_insert_id(),'Subió una imagen.');$notice='Imagen subida.';
    }
   }
  }
 }elseif(($_POST['action']??'')==='delete'&&auth_has_role(['administrator'])){
  $id=(int)($_POST['id']??0);$m=db_fetch_one('SELECT * FROM media WHERE id=:id',['id'=>$id]);
  if($m){@unlink(UPLOADS_PATH.'/'.trim($m['directory'],'/').'/'.$m['filename']);db_execute('DELETE FROM media WHERE id=:id',['id'=>$id]);$notice='Archivo eliminado.';}
 }
}
$media=db_fetch_all('SELECT * FROM media ORDER BY created_at DESC');
admin_top('Multimedia','media');?>
<?php if($errors):?><div class="alert error"><?=e(implode(' ',$errors))?></div><?php endif?><?php if($notice):?><div class="alert"><?=e($notice)?></div><?php endif?>
<section class="panel pad"><form method="post" enctype="multipart/form-data"><input type="hidden" name="csrf_token" value="<?=e(auth_csrf_token())?>"><input type="hidden" name="action" value="upload"><div class="grid"><div class="field"><label>Imagen</label><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif" required></div><div class="field"><label>Texto alternativo</label><input name="alt_text" maxlength="255"></div><div class="wide"><button class="btn primary">Subir imagen</button></div></div></form></section>
<div style="height:18px"></div><section class="panel"><table><thead><tr><th>Vista</th><th>Archivo</th><th>Dimensiones</th><th>Acciones</th></tr></thead><tbody>
<?php foreach($media as $m):?><tr><td><img src="<?=e(upload_url(trim($m['directory'],'/').'/'.$m['filename']))?>" alt="<?=e($m['alt_text']??'')?>" style="width:76px;height:58px;object-fit:cover;border-radius:9px"></td><td><strong><?=e($m['original_name'])?></strong><br><small><?=e($m['mime_type'])?></small></td><td><?=e(($m['width']??'—').' × '.($m['height']??'—'))?></td><td><?php if(auth_has_role(['administrator'])):?><form method="post" onsubmit="return confirm('¿Eliminar archivo?')"><input type="hidden" name="csrf_token" value="<?=e(auth_csrf_token())?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?=e($m['id'])?>"><button class="btn danger">Eliminar</button></form><?php endif?></td></tr><?php endforeach?>
<?php if(!$media):?><tr><td colspan="4" class="empty">No hay archivos todavía.</td></tr><?php endif?></tbody></table></section><?php admin_bottom();?>
