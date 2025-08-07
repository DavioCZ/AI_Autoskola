-- =================================================================
--  Databázové schéma pro aplikaci Autoškola
--  Navrženo na základě datových modelů v `src/dataModels.ts`
--  Verze: 1.0
-- =================================================================

-- -----------------------------------------------------------------
-- Tabulka 1: `students`
-- Uchovává informace o uživatelských profilech studentů.
-- -----------------------------------------------------------------
CREATE TABLE `students` (
    `id` VARCHAR(255) NOT NULL,
    `driving_license_group` ENUM('A', 'B', 'C', 'D', 'B+E', 'C+E', 'D+E') NOT NULL,
    `driving_school_id` VARCHAR(255) NULL,
    `instructor_id` VARCHAR(255) NULL,
    `registration_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `age` TINYINT UNSIGNED NULL,
    `gender` ENUM('male', 'female', 'other') NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabulka 2: `questions`
-- Statická data o všech testových otázkách.
-- -----------------------------------------------------------------
CREATE TABLE `questions` (
    `id` VARCHAR(255) NOT NULL,
    `text` TEXT NOT NULL,
    `media_id` VARCHAR(255) NULL COMMENT 'Odkaz na obrázek/video, např. ID souboru v S3',
    `topic` ENUM('rules', 'signs', 'situations', 'safety', 'medical', 'vehicle_conditions', 'regulations') NOT NULL,
    `subtopic` VARCHAR(255) NULL,
    `points` TINYINT UNSIGNED NOT NULL,
    `statistical_difficulty` DECIMAL(3, 2) NULL COMMENT 'Např. 0.75 znamená 75% úspěšnost napříč všemi studenty',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabulka 3: `answers`
-- Možné odpovědi pro každou otázku. Odděleno pro flexibilitu.
-- -----------------------------------------------------------------
CREATE TABLE `answers` (
    `id` VARCHAR(255) NOT NULL,
    `question_id` VARCHAR(255) NOT NULL,
    `text` TEXT NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_question_id` (`question_id`),
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabulka 4: `test_sessions`
-- Záznamy o každém spuštěném testu (relaci).
-- -----------------------------------------------------------------
CREATE TABLE `test_sessions` (
    `id` VARCHAR(255) NOT NULL,
    `student_id` VARCHAR(255) NOT NULL,
    `start_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_time` TIMESTAMP NULL,
    `total_time_seconds` INT UNSIGNED NULL,
    `test_type` ENUM('full_exam', 'topic_practice', 'mistake_practice', 'quick_test') NOT NULL,
    `result` ENUM('passed', 'failed') NULL,
    `total_points` SMALLINT UNSIGNED NULL,
    `score_percentage` DECIMAL(5, 2) NULL,
    `status` ENUM('completed', 'interrupted', 'timed_out') NOT NULL,
    `device` ENUM('desktop', 'mobile_app_ios', 'mobile_app_android', 'mobile_web') NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_student_id` (`student_id`),
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabulka 5: `student_answers`
-- Záznam o odpovědi studenta na konkrétní otázku v rámci jedné session.
-- Toto je klíčová tabulka pro analýzu výkonu.
-- -----------------------------------------------------------------
CREATE TABLE `student_answers` (
    `id` VARCHAR(255) NOT NULL,
    `session_id` VARCHAR(255) NOT NULL,
    `student_id` VARCHAR(255) NOT NULL COMMENT 'Denormalizováno pro snazší dotazy na výkon studenta',
    `question_id` VARCHAR(255) NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `time_to_answer_seconds` INT UNSIGNED NOT NULL,
    `question_order_in_test` SMALLINT UNSIGNED NOT NULL,
    `marked_for_later_review` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    INDEX `idx_session_id` (`session_id`),
    INDEX `idx_student_question` (`student_id`, `question_id`),
    FOREIGN KEY (`session_id`) REFERENCES `test_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabulka 6: `student_selected_answers`
-- Spojovací tabulka pro zaznamenání, které konkrétní odpovědi
-- student zvolil (řeší případy, kdy je správných odpovědí více).
-- -----------------------------------------------------------------
CREATE TABLE `student_selected_answers` (
    `student_answer_id` VARCHAR(255) NOT NULL,
    `selected_answer_id` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`student_answer_id`, `selected_answer_id`),
    FOREIGN KEY (`student_answer_id`) REFERENCES `student_answers`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`selected_answer_id`) REFERENCES `answers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabulka 7: `student_stats`
-- Agregované statistiky pro každého studenta pro rychlé zobrazení
-- na dashboardu. Tato tabulka by se měla aktualizovat po každé
-- dokončené session pomocí triggeru nebo aplikační logiky.
-- -----------------------------------------------------------------
CREATE TABLE `student_stats` (
    `student_id` VARCHAR(255) NOT NULL,
    `total_exam_taken` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_exam_passed` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_practice_answered` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_practice_correct` INT UNSIGNED NOT NULL DEFAULT 0,
    `today_exam_taken` INT UNSIGNED NOT NULL DEFAULT 0,
    `today_exam_passed` INT UNSIGNED NOT NULL DEFAULT 0,
    `today_practice_answered` INT UNSIGNED NOT NULL DEFAULT 0,
    `today_practice_correct` INT UNSIGNED NOT NULL DEFAULT 0,
    `today_last_reset` DATE NOT NULL,
    `exam_avg_score` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `exam_avg_time` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `last_exam_score` INT UNSIGNED NULL,
    `last_exam_time_spent` INT UNSIGNED NULL,
    `last_exam_passed` BOOLEAN NULL,
    `last_practice_answered` INT UNSIGNED NULL,
    `last_practice_correct` INT UNSIGNED NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`student_id`),
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
