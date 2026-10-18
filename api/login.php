<?php
/* =========================================================
   API : CONNEXION
   Reçoit : email, password, remember (true/false)
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

require_method('POST');
$data = read_json();

$email    = strtolower(trim((string) ($data['email'] ?? '')));
$password = (string) ($data['password'] ?? '');
$remember = !empty($data['remember']);

if ($email === '' || $password === '') {
    send_error('Entrez votre email et votre mot de passe.', 422);
}

$stmt = db()->prepare(
    'SELECT id, first_name, last_name, email, phone, address, password_hash FROM users WHERE email = ?'
);
$stmt->execute([$email]);
$user = $stmt->fetch();

// password_verify compare le mot de passe tapé avec l'empreinte enregistrée.
// Même message dans les deux cas : on ne révèle pas si l'email existe.
if (!$user || !password_verify($password, $user['password_hash'])) {
    send_error('Email ou mot de passe incorrect.', 401);
}

// Nouvel identifiant de session à chaque connexion (protection contre le vol de session)
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];

// "Se souvenir de moi" : le cookie de session dure 30 jours au lieu de s'effacer
// à la fermeture du navigateur
if ($remember) {
    setcookie(session_name(), session_id(), [
        'expires'  => time() + 60 * 60 * 24 * 30,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

send_json(['ok' => true, 'user' => user_payload($user)]);