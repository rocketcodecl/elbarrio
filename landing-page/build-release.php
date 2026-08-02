<?php
declare(strict_types=1);

$root = __DIR__;
$releaseDir = $root . '/releases';
if (!is_dir($releaseDir)) mkdir($releaseDir, 0755, true);
$token = bin2hex(random_bytes(32));

function addPath(ZipArchive $zip, string $source, string $target): void
{
    if (is_dir($source)) {
        $zip->addEmptyDir($target);
        foreach (array_diff(scandir($source) ?: [], ['.', '..', '.DS_Store']) as $item) {
            addPath($zip, $source . '/' . $item, $target . '/' . $item);
        }
        return;
    }
    $zip->addFile($source, $target);
}

function openZip(string $path): ZipArchive
{
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException("No fue posible crear {$path}");
    }
    return $zip;
}

$landing = openZip($releaseDir . '/elbarrio-landing.zip');
foreach (['.htaccess', 'index.html', 'styles.css', 'script.js', 'README.md', 'publish.php', 'leads.php'] as $file) addPath($landing, $root . '/' . $file, $file);
foreach (['assets', 'content'] as $directory) addPath($landing, $root . '/' . $directory, $directory);
$landing->addEmptyDir('data');
$landing->addFile($root . '/data/.htaccess', 'data/.htaccess');
$landing->addFromString('publish-config.php', "<?php\nreturn ['token' => " . var_export($token, true) . "];\n");
$landing->close();

$cms = openZip($releaseDir . '/elbarrio-cms.zip');
foreach (['.htaccess', 'api.php', 'bootstrap.php', 'index.php', 'install.php'] as $file) addPath($cms, $root . '/admin/' . $file, $file);
foreach (['assets', 'content'] as $directory) addPath($cms, $root . '/admin/' . $directory, $directory);
$cms->addFromString('pairing.php', "<?php\nreturn " . var_export([
    'publish_url' => 'https://elbarrio.lat/publish.php',
    'publish_token' => $token,
], true) . ";\n");
$cms->close();

echo "Paquetes creados en {$releaseDir}\n";
