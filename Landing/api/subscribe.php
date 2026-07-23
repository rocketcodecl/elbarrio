<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/bootstrap.php';require_installation();
if(request_method()!=='POST')json_response(['ok'=>false,'message'=>'Método no permitido.'],405);
$email=mb_strtolower(trim((string)($_POST['email']??'')));$name=trim((string)($_POST['name']??''));
if(!filter_var($email,FILTER_VALIDATE_EMAIL))json_response(['ok'=>false,'message'=>'Ingresa un correo válido.'],422);
db_execute('INSERT INTO subscribers(email,name,status,source,verified_at,created_at,updated_at) VALUES(:email,:name,"active","website",NOW(),NOW(),NOW()) ON DUPLICATE KEY UPDATE name=COALESCE(NULLIF(VALUES(name),""),name),status="active",unsubscribed_at=NULL,updated_at=NOW()',['email'=>$email,'name'=>$name?:null]);
json_response(['ok'=>true,'message'=>'Ya eres parte de El Barrio.']);
