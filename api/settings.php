<?php
/* =========================================================
   API : PARAMÈTRES DE L'UTILISATEUR
   GET → lire mes paramètres
   PUT → enregistrer mes paramètres
   ========================================================= */
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$userId = require_login();

const CATEGORY_KEYS = ['logement', 'alimentation', 'etudes', 'transport', 'loisirs', 'divers'];

// Lit les paramètres enregistrés, complétés par les valeurs par défaut
function load_user_settings(int $userId): array
{
    $stmt = db()->prepare('SELECT data FROM settings WHERE user_id = ?');
    $stmt->execute([$userId]);
    $saved = json_decode((string) ($stmt->fetchColumn() ?: '{}'), true);
    $defaults = default_settings();

    if (!is_array($saved)) {
        return $defaults;
    }

    return [
        'budget'      => $saved['budget'] ?? $defaults['budget'],
        'recommended' => array_merge($defaults['recommended'], (array) ($saved['recommended'] ?? [])),
        'colors'      => array_merge($defaults['colors'], (array) ($saved['colors'] ?? [])),
        'animations'  => $saved['animations'] ?? $defaults['animations'],
    ];
}

switch ($_SERVER['REQUEST_METHOD']) {

    case 'GET':
        send_json(['ok' => true, 'settings' => load_user_settings($userId)]);

    case 'PUT':
        $data = read_json();

        // Budget : un nombre entre 0 et 10 millions
        $budget = $data['budget'] ?? 0;
        if (!is_numeric($budget) || (float) $budget < 0 || (float) $budget > 10000000) {
            send_error('Budget invalide.', 422, 'budget');
        }

        // Répartition : 6 nombres entre 0 et 100, dont le total fait 100
        $input = is_array($data['recommended'] ?? null) ? $data['recommended'] : [];
        $recommended = [];
        $total = 0;
        foreach (CATEGORY_KEYS as $key) {
            $value = $input[$key] ?? null;
            if (!is_numeric($value) || (int) $value < 0 || (int) $value > 100) {
                send_error('Répartition invalide.', 422, 'recommended');
            }
            $recommended[$key] = (int) $value;
            $total += (int) $value;
        }
        if ($total !== 100) {
            send_error('La répartition doit faire 100 %.', 422, 'recommended');
        }

        // Couleurs : 6 codes au format #rrggbb
        $inputColors = is_array($data['colors'] ?? null) ? $data['colors'] : [];
        $colors = [];
        foreach (CATEGORY_KEYS as $key) {
            $color = (string) ($inputColors[$key] ?? '');
            if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
                send_error('Couleur invalide.', 422, 'colors');
            }
            $colors[$key] = strtolower($color);
        }

        $settings = [
            'budget'      => round((float) $budget, 2),
            'recommended' => $recommended,
            'colors'      => $colors,
            'animations'  => (bool) ($data['animations'] ?? true),
        ];
        $json = json_encode($settings);

        // Crée la ligne si elle n'existe pas, sinon la met à jour
        $stmt = db()->prepare(
            'INSERT INTO settings (user_id, data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = ?'
        );
        $stmt->execute([$userId, $json, $json]);

        send_json(['ok' => true, 'settings' => $settings]);

    default:
        send_error('Méthode non autorisée.', 405);
}