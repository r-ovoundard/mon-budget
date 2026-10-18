-- =========================================================
-- BASE DE DONNÉES MONBUDGET
-- utf8mb4 : gère tous les caractères (accents, emojis…)
-- =========================================================
CREATE DATABASE IF NOT EXISTS mon_budget
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mon_budget;

-- =========================================================
-- UTILISATEURS
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- numéro unique, attribué automatiquement
  first_name    VARCHAR(40)  NOT NULL,
  last_name     VARCHAR(40)  NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,            -- deux comptes ne peuvent pas avoir le même email
  phone         VARCHAR(20)  NOT NULL,
  address       VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,                   -- jamais le mot de passe lui-même
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- DÉPENSES
-- Chaque dépense appartient à un utilisateur (user_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS expenses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,                   -- montant exact, sans erreur d'arrondi
  category     ENUM('logement', 'alimentation', 'etudes', 'transport', 'loisirs', 'divers') NOT NULL,
  expense_date DATE          NOT NULL,
  description  VARCHAR(60)   NOT NULL DEFAULT '',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_date (user_id, expense_date),           -- recherches rapides par utilisateur et par date
  -- Si un utilisateur est supprimé, ses dépenses le sont aussi
  CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- PARAMÈTRES (une ligne par utilisateur)
-- Les réglages sont rangés en JSON, comme dans settings.js
-- =========================================================
CREATE TABLE IF NOT EXISTS settings (
  user_id    INT UNSIGNED PRIMARY KEY,
  data       JSON         NOT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;