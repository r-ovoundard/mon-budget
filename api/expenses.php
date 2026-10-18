<?php
/* =========================================================
   API : DÉPENSES
   GET    → liste des dépenses de l'utilisateur connecté
   POST   → ajouter une dépense
   PUT    → modifier une dépense
   DELETE → supprimer une dépense (?id=...)
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

// Connexion obligatoire : on récupère l'identifiant de l'utilisateur
$userId = require_login();

const CATEGORIES = ['logement', 'alimentation', 'etudes', 'transport', 'loisirs', 'divers'];

/* ---------- Outils ---------- */

// Transforme une ligne de la base en dépense au format attendu par le JavaScript
function expense_payload(array $row): array
{
    return [
        'id'          => (string) $row['id'],
        'amount'      => (float) $row['amount'],
        'category'    => $row['category'],
        'date'        => $row['expense_date'],
        'description' => $row['description'],
        'createdAt'   => strtotime($row['created_at']) * 1000,
    ];
}

// Cherche une dépense, seulement si elle appartient à l'utilisateur
function find_expense(int $id, int $userId): ?array
{
    $stmt = db()->prepare(
        'SELECT id, amount, category, expense_date, description, created_at
         FROM expenses WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$id, $userId]);
    return $stmt->fetch() ?: null;
}

// Vérifie les données d'une dépense et les renvoie nettoyées
function validate_expense(array $data): array
{
    $amount = $data['amount'] ?? null;
    if (!is_numeric($amount) || (float) $amount <= 0 || (float) $amount > 1000000) {
        send_error('Entrez un montant supérieur à 0.', 422, 'amount');
    }

    $category = (string) ($data['category'] ?? '');
    if (!in_array($category, CATEGORIES, true)) {
        send_error('Choisissez une catégorie.', 422, 'category');
    }

    // La date doit exister vraiment (pas de 31 février)
    $date = (string) ($data['date'] ?? '');
    $parsed = DateTime::createFromFormat('Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        send_error('Choisissez une date valide.', 422, 'date');
    }

    $description = trim((string) ($data['description'] ?? ''));
    if (mb_strlen($description) > 60) {
        send_error('Description trop longue (60 caractères maximum).', 422, 'description');
    }

    return [round((float) $amount, 2), $category, $date, $description];
}

/* ---------- Selon la méthode de la requête ---------- */

switch ($_SERVER['REQUEST_METHOD']) {

    // Lire mes dépenses, de la plus récente à la plus ancienne
    case 'GET':
        $stmt = db()->prepare(
            'SELECT id, amount, category, expense_date, description, created_at
             FROM expenses WHERE user_id = ?
             ORDER BY expense_date DESC, id DESC'
        );
        $stmt->execute([$userId]);
        send_json(['ok' => true, 'expenses' => array_map('expense_payload', $stmt->fetchAll())]);

    // Ajouter une dépense
    case 'POST':
        [$amount, $category, $date, $description] = validate_expense(read_json());

        $stmt = db()->prepare(
            'INSERT INTO expenses (user_id, amount, category, expense_date, description)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $amount, $category, $date, $description]);

        $created = find_expense((int) db()->lastInsertId(), $userId);
        send_json(['ok' => true, 'expense' => expense_payload($created)], 201);

    // Modifier une de mes dépenses
    case 'PUT':
        $data = read_json();
        $id = (int) ($data['id'] ?? 0);

        if (!find_expense($id, $userId)) {
            send_error('Dépense introuvable.', 404);
        }

        [$amount, $category, $date, $description] = validate_expense($data);

        // "AND user_id = ?" : impossible de modifier la dépense de quelqu'un d'autre
        $stmt = db()->prepare(
            'UPDATE expenses SET amount = ?, category = ?, expense_date = ?, description = ?
             WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$amount, $category, $date, $description, $id, $userId]);

        send_json(['ok' => true, 'expense' => expense_payload(find_expense($id, $userId))]);

    // Supprimer une de mes dépenses (l'id est dans l'adresse : expenses.php?id=12)
    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);

        $stmt = db()->prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);

        if ($stmt->rowCount() === 0) {
            send_error('Dépense introuvable.', 404);
        }
        send_json(['ok' => true]);

    default:
        send_error('Méthode non autorisée.', 405);
}