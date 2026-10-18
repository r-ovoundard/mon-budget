<?php
/* =========================================================
   TEST : est-ce que PHP arrive à parler à MySQL ?
   (fichier temporaire, on le supprimera plus tard)
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $version = db()->query('SELECT VERSION()')->fetchColumn();
    echo json_encode(['ok' => true, 'mysql' => $version]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'erreur' => $e->getMessage()]);
}