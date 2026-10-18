<?php
/* =========================================================
   API : INSCRIPTION
   Reçoit : firstName, lastName, email, phone, address, password
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

require_method('POST');
$data = read_json();

$firstName = trim((string) ($data['firstName'] ?? ''));
$lastName  = trim((string) ($data['lastName'] ?? ''));
$email     = strtolower(trim((string) ($data['email'] ?? '')));
$phone     = trim((string) ($data['phone'] ?? ''));
$address   = trim((string) ($data['address'] ?? ''));
$password  = (string) ($data['password'] ?? '');

/* ---------- Vérifications ----------
   On revérifie TOUT côté serveur : le JavaScript peut être contourné,
   le serveur est la seule vraie protection. */

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

// 8 caractères minimum + au moins 2 règles parmi : majuscule, chiffre, caractère spécial
$rules = preg_match('/[A-Z]/', $password) + preg_match('/\d/', $password) + preg_match('/[^A-Za-z0-9]/', $password);
if (strlen($password) < 8 || $rules < 2) {
    send_error('Mot de passe trop faible : 8 caractères et 3 règles minimum.', 422, 'password');
}

/* ---------- Email déjà utilisé ? ---------- */

// Requête préparée : le "?" est remplacé de façon sûre (pas d'injection SQL possible)
$check = db()->prepare('SELECT id FROM users WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    send_error('Un compte existe déjà avec cet email.', 409, 'email');
}

/* ---------- Création du compte ---------- */

// password_hash : empreinte sécurisée et salée automatiquement (bcrypt)
$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    $insert = db()->prepare(
        'INSERT INTO users (first_name, last_name, email, phone, address, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([$firstName, $lastName, $email, $phone, $address, $hash]);
} catch (PDOException $e) {
    // Code 23000 : l'email existe déjà (deux inscriptions en même temps)
    if ($e->getCode() === '23000') {
        send_error('Un compte existe déjà avec cet email.', 409, 'email');
    }
    send_error('Erreur du serveur, réessayez plus tard.', 500);
}

$userId = (int) db()->lastInsertId();

// Chaque nouveau compte reçoit les paramètres par défaut
$settings = db()->prepare('INSERT INTO settings (user_id, data) VALUES (?, ?)');
$settings->execute([$userId, json_encode(default_settings())]);

/* ---------- Connexion automatique ---------- */

// Nouvel identifiant de session : empêche le "vol de session"
session_regenerate_id(true);
$_SESSION['user_id'] = $userId;

send_json([
    'ok'   => true,
    'user' => [
        'id'        => $userId,
        'firstName' => $firstName,
        'lastName'  => $lastName,
        'email'     => $email,
    ],
], 201);