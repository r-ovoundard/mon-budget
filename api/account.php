<?php
/* =========================================================
   API : MON COMPTE
   GET    → mes informations + mes statistiques
   DELETE → supprimer mon compte (mot de passe obligatoire)
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$userId = require_login();

switch ($_SERVER['REQUEST_METHOD']) {

    case 'GET':
        $stmt = db()->prepare(
            'SELECT id, first_name, last_name, email, phone, address, created_at FROM users WHERE id = ?'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            send_error('Compte introuvable.', 404);
        }

        // Nombre de dépenses et total dépensé
        $totals = db()->prepare(
            'SELECT COUNT(*) AS expense_count, COALESCE(SUM(amount), 0) AS total
             FROM expenses WHERE user_id = ?'
        );
        $totals->execute([$userId]);
        $sums = $totals->fetch();

        // Catégorie où l'utilisateur a le plus dépensé
        $top = db()->prepare(
            'SELECT category FROM expenses WHERE user_id = ?
             GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1'
        );
        $top->execute([$userId]);

        send_json([
            'ok'    => true,
            'user'  => user_payload($user) + ['createdAt' => $user['created_at']],
            'stats' => [
                'count'       => (int) $sums['expense_count'],
                'total'       => (float) $sums['total'],
                'topCategory' => $top->fetchColumn() ?: null,
            ],
        ]);

    case 'DELETE':
        $password = (string) (read_json()['password'] ?? '');

        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$userId]);

        if (!password_verify($password, (string) $stmt->fetchColumn())) {
            send_error('Mot de passe incorrect.', 422, 'password');
        }

        // ON DELETE CASCADE (dans schema.sql) : les dépenses et les paramètres
        // de l'utilisateur sont supprimés automatiquement avec lui
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

        // Fin de la session
        $_SESSION = [];
        setcookie(session_name(), '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_destroy();

        send_json(['ok' => true]);

    default:
        send_error('Méthode non autorisée.', 405);
}