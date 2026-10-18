<?php
/* =========================================================
   BOÎTE À OUTILS COMMUNE DE L'API
   Chargée au début de chaque fichier de l'API.
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/db.php';

// Session PHP : le serveur se souvient de l'utilisateur connecté grâce à un cookie.
// httponly : le JavaScript ne peut pas lire ce cookie (protection contre le vol de session)
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// Toutes les réponses de l'API sont en JSON
header('Content-Type: application/json; charset=utf-8');

/* ---------- Réponses ---------- */

// Envoie une réponse JSON et arrête le script
function send_json(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Envoie une erreur ; "field" indique quel champ du formulaire est en cause
function send_error(string $message, int $status = 400, ?string $field = null): void
{
    send_json(['ok' => false, 'error' => $message, 'field' => $field], $status);
}

/* ---------- Requêtes ---------- */

// Lit les données JSON envoyées par le JavaScript
function read_json(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($data) ? $data : [];
}

// Refuse la requête si elle n'utilise pas la bonne méthode (GET, POST…)
function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        send_error('Méthode non autorisée.', 405);
    }
}

/* ---------- Utilisateur connecté ---------- */

function current_user_id(): ?int
{
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

// Arrête tout si personne n'est connecté
function require_login(): int
{
    $userId = current_user_id();
    if ($userId === null) {
        send_error('Vous devez être connecté.', 401);
    }
    return $userId;
}

/* ---------- Paramètres par défaut (les mêmes que settings.js) ---------- */

function default_settings(): array
{
    return [
        'budget'      => 0,
        'recommended' => [
            'logement' => 45, 'alimentation' => 20, 'etudes' => 10,
            'transport' => 5, 'loisirs' => 10, 'divers' => 10,
        ],
        'colors'      => [
            'logement' => '#e76f51', 'alimentation' => '#f4a261', 'etudes' => '#2a9d8f',
            'transport' => '#8ab17d', 'loisirs' => '#e9c46a', 'divers' => '#b5838d',
        ],
        'animations'  => true,
    ];
}