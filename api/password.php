<?php
/* =========================================================
   API : CHANGER MON MOT DE PASSE
   PUT → currentPassword, newPassword
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$userId = require_login();
require_method('PUT');

$data = read_json();
$currentPassword = (string) ($data['currentPassword'] ?? '');
$newPassword     = (string) ($data['newPassword'] ?? '');

$stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$userId]);
$hash = (string) $stmt->fetchColumn();

// L'ancien mot de passe est obligatoire : quelqu'un qui utiliserait ton
// ordinateur pendant que tu es connecté ne peut pas le changer
if (!password_verify($currentPassword, $hash)) {
    send_error('Mot de passe actuel incorrect.', 422, 'currentPassword');
}

$rules = preg_match('/[A-Z]/', $newPassword) + preg_match('/\d/', $newPassword) + preg_match('/[^A-Za-z0-9]/', $newPassword);
if (strlen($newPassword) < 8 || $rules < 2) {
    send_error('Nouveau mot de passe trop faible : 8 caractères et 3 règles minimum.', 422, 'newPassword');
}

if (password_verify($newPassword, $hash)) {
    send_error("Le nouveau mot de passe doit être différent de l'actuel.", 422, 'newPassword');
}

$update = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$update->execute([password_hash($newPassword, PASSWORD_DEFAULT), $userId]);

session_regenerate_id(true); // nouvel identifiant de session après un changement sensible

send_json(['ok' => true]);