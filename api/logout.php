<?php
/* =========================================================
   API : DÉCONNEXION
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

require_method('POST');

// Vide la session, supprime le cookie, puis détruit la session côté serveur
$_SESSION = [];
setcookie(session_name(), '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_destroy();

send_json(['ok' => true]);