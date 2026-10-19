<?php
/* =========================================================
   API : MODIFIER MON PROFIL
   PUT → firstName, lastName, email, phone, address
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$userId = require_login();
require_method('PUT');

$data = read_json();

$firstName = trim((string) ($data['firstName'] ?? ''));
$lastName  = trim((string) ($data['lastName'] ?? ''));
$email     = strtolower(trim((string) ($data['email'] ?? '')));
$phone     = trim((string) ($data['phone'] ?? ''));
$address   = trim((string) ($data['address'] ?? ''));

/* ---------- Vérifications (les mêmes qu'à l'inscription) ---------- */

if (mb_strlen($firstName) < 2 || mb_strlen($firstName) > 40) {
    send_error('Entrez votre prénom (2 lettres minimum).', 422, 'firstName');
}

if (mb_strlen($lastName) < 2 || mb_strlen($lastName) > 40) {
    send_error('Entrez votre nom (2 lettres minimum).', 422, 'lastName');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    send_error('Entrez une adresse email valide.', 422, 'email');
}

$phoneDigits = preg_replace('/[\s.\-()]/', '', $phone);
if (!preg_match('/^\+?\d{9,15}$/', $phoneDigits)) {
    send_error('Entrez un numéro valide (ex : 06 12 34 56 78).', 422, 'phone');
}

if (mb_strlen($address) < 8 || mb_strlen($address) > 120) {
    send_error('Entrez votre adresse complète.', 422, 'address');
}

/* ---------- L'email est-il pris par QUELQU'UN D'AUTRE ? ---------- */

$check = db()->prepare('SELECT id FROM users WHERE email = ? AND id <> ?');
$check->execute([$email, $userId]);
if ($check->fetch()) {
    send_error('Cet email est déjà utilisé par un autre compte.', 409, 'email');
}

/* ---------- Mise à jour ---------- */

try {
    $update = db()->prepare(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ? WHERE id = ?'
    );
    $update->execute([$firstName, $lastName, $email, $phone, $address, $userId]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        send_error('Cet email est déjà utilisé par un autre compte.', 409, 'email');
    }
    send_error('Erreur du serveur, réessayez plus tard.', 500);
}

$stmt = db()->prepare('SELECT id, first_name, last_name, email, phone, address FROM users WHERE id = ?');
$stmt->execute([$userId]);

send_json(['ok' => true, 'user' => user_payload($stmt->fetch())]);