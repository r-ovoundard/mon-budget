<?php
/* =========================================================
   API : QUI EST CONNECTÉ ?
   Renvoie l'utilisateur connecté, ou null si personne
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

require_method('GET');

$userId = current_user_id();
if ($userId === null) {
    send_json(['ok' => true, 'user' => null]);
}

$stmt = db()->prepare('SELECT id, first_name, last_name, email, phone, address FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

// Le compte a été supprimé entre-temps : on ferme la session
if (!$user) {
    $_SESSION = [];
    session_destroy();
    send_json(['ok' => true, 'user' => null]);
}

send_json(['ok' => true, 'user' => user_payload($user)]);