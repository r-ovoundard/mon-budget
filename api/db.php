<?php
/* =========================================================
   CONNEXION À LA BASE DE DONNÉES (PDO)
   Tous les autres fichiers PHP utiliseront la fonction db().
   ========================================================= */
declare(strict_types=1);

// Réglages de WAMP en local (utilisateur root, sans mot de passe).
// Sur un vrai hébergeur, ces informations seraient différentes et secrètes.
const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'mon_budget';
const DB_USER = 'root';
const DB_PASS = '';

function db(): PDO
{
    // "static" : la connexion est créée une seule fois, puis réutilisée
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';

        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // une erreur SQL lance une exception
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // résultats sous forme de tableaux clé => valeur
            PDO::ATTR_EMULATE_PREPARES   => false,                  // vraies requêtes préparées (anti-injection SQL)
        ]);
    }

    return $pdo;
}