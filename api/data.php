<?php
/* =========================================================
   API : DONNÉES DE L'UTILISATEUR
   POST   → importer : remplace toutes MES dépenses par celles du fichier
   DELETE → tout effacer : supprime toutes MES dépenses
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$userId = require_login();

const DATA_CATEGORIES = ['logement', 'alimentation', 'etudes', 'transport', 'loisirs', 'divers'];

switch ($_SERVER['REQUEST_METHOD']) {

    // Importer une sauvegarde
    case 'POST':
        $items = read_json()['expenses'] ?? null;

        if (!is_array($items)) {
            send_error('Fichier invalide : aucune dépense trouvée.', 422);
        }
        if (count($items) > 5000) {
            send_error('Trop de dépenses dans ce fichier (5000 maximum).', 422);
        }

        // 1. On vérifie TOUTES les dépenses avant de toucher à la base
        $clean = [];
        foreach ($items as $index => $item) {
            $position = $index + 1;

            if (!is_array($item)) {
                send_error("Dépense n°$position invalide.", 422);
            }

            $amount = $item['amount'] ?? null;
            if (!is_numeric($amount) || (float) $amount <= 0 || (float) $amount > 1000000) {
                send_error("Dépense n°$position : montant invalide.", 422);
            }

            $category = (string) ($item['category'] ?? '');
            if (!in_array($category, DATA_CATEGORIES, true)) {
                send_error("Dépense n°$position : catégorie invalide.", 422);
            }

            $date = (string) ($item['date'] ?? '');
            $parsed = DateTime::createFromFormat('Y-m-d', $date);
            if (!$parsed || $parsed->format('Y-m-d') !== $date) {
                send_error("Dépense n°$position : date invalide.", 422);
            }

            $description = mb_substr(trim((string) ($item['description'] ?? '')), 0, 60);

            $clean[] = [round((float) $amount, 2), $category, $date, $description];
        }

        // 2. Transaction : soit tout réussit, soit rien n'est modifié
        $pdo = db();
        $pdo->beginTransaction();

        try {
            $pdo->prepare('DELETE FROM expenses WHERE user_id = ?')->execute([$userId]);

            $insert = $pdo->prepare(
                'INSERT INTO expenses (user_id, amount, category, expense_date, description)
                 VALUES (?, ?, ?, ?, ?)'
            );
            foreach ($clean as [$amount, $category, $date, $description]) {
                $insert->execute([$userId, $amount, $category, $date, $description]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack(); // annule tout : les anciennes dépenses sont conservées
            send_error("Erreur pendant l'import : rien n'a été modifié.", 500);
        }

        send_json(['ok' => true, 'count' => count($clean)]);

    // Tout effacer (uniquement MES dépenses)
    case 'DELETE':
        $stmt = db()->prepare('DELETE FROM expenses WHERE user_id = ?');
        $stmt->execute([$userId]);
        send_json(['ok' => true, 'deleted' => $stmt->rowCount()]);

    default:
        send_error('Méthode non autorisée.', 405);
}