<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/bootstrap.php';require_installation();
if(request_method()!=='POST') json_response(['ok'=>false,'message'=>'Método no permitido.'],405);
$honeypot=trim((string)($_POST['website']??''));if($honeypot!=='')json_response(['ok'=>true,'message'=>'Gracias.']);
$name=trim((string)($_POST['name']??''));$email=mb_strtolower(trim((string)($_POST['email']??'')));$phone=trim((string)($_POST['phone']??''));$subject=trim((string)($_POST['subject']??''));$message=trim((string)($_POST['message']??''));
if(mb_strlen($name)<2||!filter_var($email,FILTER_VALIDATE_EMAIL)||mb_strlen($message)<10)json_response(['ok'=>false,'message'=>'Completa nombre, correo y un mensaje de al menos 10 caracteres.'],422);
$recent=db_fetch_one('SELECT COUNT(*) total FROM contact_messages WHERE ip_address=:ip AND created_at>=DATE_SUB(NOW(),INTERVAL 10 MINUTE)',['ip'=>request_ip()]);
if((int)($recent['total']??0)>=5)json_response(['ok'=>false,'message'=>'Espera unos minutos antes de enviar otro mensaje.'],429);
db_execute('INSERT INTO contact_messages(name,email,phone,subject,message,status,source,ip_address,user_agent,created_at,updated_at) VALUES(:name,:email,:phone,:subject,:message,"new","website",:ip,:ua,NOW(),NOW())',['name'=>mb_substr($name,0,120),'email'=>mb_substr($email,0,190),'phone'=>$phone?:null,'subject'=>$subject?:null,'message'=>$message,'ip'=>request_ip(),'ua'=>mb_substr((string)($_SERVER['HTTP_USER_AGENT']??''),0,500)]);
json_response(['ok'=>true,'message'=>'Mensaje enviado. Te contactaremos pronto.']);
