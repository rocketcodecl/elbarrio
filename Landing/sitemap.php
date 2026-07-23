<?php
declare(strict_types=1);
require_once __DIR__.'/includes/bootstrap.php';require_installation();
header('Content-Type: application/xml; charset=UTF-8');
$pages=db_fetch_all("SELECT slug,updated_at FROM pages WHERE status='published' ORDER BY id");
echo '<?xml version="1.0" encoding="UTF-8"?>'."\n";
?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc><?=e(app_url())?></loc><lastmod><?=e(date('c'))?></lastmod></url><?php foreach($pages as $p):?><url><loc><?=e(app_url($p['slug']))?></loc><lastmod><?=e(date('c',strtotime($p['updated_at'])))?></lastmod></url><?php endforeach?></urlset>
