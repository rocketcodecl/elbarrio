-- ============================================================================
-- El Barrio
-- Esquema inicial MySQL / MariaDB
-- Compatible con MySQL 8+ y MariaDB 10.5+
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('administrator','editor','moderator') NOT NULL DEFAULT 'editor',
    `status` ENUM('active','inactive','blocked') NOT NULL DEFAULT 'active',
    `last_login_at` DATETIME NULL DEFAULT NULL,
    `last_login_ip` VARCHAR(45) NULL DEFAULT NULL,
    `password_changed_at` DATETIME NULL DEFAULT NULL,
    `remember_token_hash` VARCHAR(255) NULL DEFAULT NULL,
    `remember_token_expires_at` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `users_email_unique` (`email`),
    KEY `users_role_status_index` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(190) NOT NULL,
    `value` LONGTEXT NULL,
    `type` ENUM('string','integer','boolean','json','datetime','text') NOT NULL DEFAULT 'string',
    `group_name` VARCHAR(100) NOT NULL DEFAULT 'general',
    `is_public` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `settings_key_unique` (`key`),
    KEY `settings_group_index` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `disk` VARCHAR(50) NOT NULL DEFAULT 'local',
    `directory` VARCHAR(255) NOT NULL DEFAULT 'media',
    `filename` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(120) NOT NULL,
    `extension` VARCHAR(20) NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `width` INT UNSIGNED NULL,
    `height` INT UNSIGNED NULL,
    `alt_text` VARCHAR(255) NULL,
    `caption` TEXT NULL,
    `checksum_sha256` CHAR(64) NULL,
    `uploaded_by` BIGINT UNSIGNED NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `media_path_unique` (`directory`, `filename`),
    KEY `media_uploaded_by_index` (`uploaded_by`),
    CONSTRAINT `media_uploaded_by_foreign`
        FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(190) NOT NULL,
    `slug` VARCHAR(190) NOT NULL,
    `excerpt` TEXT NULL,
    `content` LONGTEXT NULL,
    `template` VARCHAR(100) NOT NULL DEFAULT 'default',
    `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    `meta_title` VARCHAR(190) NULL,
    `meta_description` VARCHAR(320) NULL,
    `canonical_url` VARCHAR(500) NULL,
    `featured_image_id` BIGINT UNSIGNED NULL,
    `published_at` DATETIME NULL DEFAULT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `pages_slug_unique` (`slug`),
    KEY `pages_status_published_index` (`status`, `published_at`),
    CONSTRAINT `pages_featured_image_foreign`
        FOREIGN KEY (`featured_image_id`) REFERENCES `media` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `pages_created_by_foreign`
        FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `pages_updated_by_foreign`
        FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contact_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `phone` VARCHAR(40) NULL,
    `subject` VARCHAR(190) NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('new','read','replied','archived','spam') NOT NULL DEFAULT 'new',
    `source` VARCHAR(100) NOT NULL DEFAULT 'website',
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `read_at` DATETIME NULL DEFAULT NULL,
    `replied_at` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `contact_messages_status_index` (`status`),
    KEY `contact_messages_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `content_sections` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `section_key` VARCHAR(120) NOT NULL,
    `title` VARCHAR(255) NULL,
    `eyebrow` VARCHAR(190) NULL,
    `subtitle` TEXT NULL,
    `content` LONGTEXT NULL,
    `button_label` VARCHAR(120) NULL,
    `button_url` VARCHAR(500) NULL,
    `secondary_button_label` VARCHAR(120) NULL,
    `secondary_button_url` VARCHAR(500) NULL,
    `media_id` BIGINT UNSIGNED NULL,
    `settings_json` LONGTEXT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `content_sections_key_unique` (`section_key`),
    KEY `content_sections_order_index` (`sort_order`),
    CONSTRAINT `content_sections_media_foreign`
        FOREIGN KEY (`media_id`) REFERENCES `media` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `content_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `section_id` BIGINT UNSIGNED NOT NULL,
    `item_key` VARCHAR(120) NULL,
    `title` VARCHAR(255) NULL,
    `subtitle` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `value` VARCHAR(120) NULL,
    `label` VARCHAR(190) NULL,
    `url` VARCHAR(500) NULL,
    `icon` VARCHAR(100) NULL,
    `media_id` BIGINT UNSIGNED NULL,
    `metadata_json` LONGTEXT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `content_items_section_order_index` (`section_id`, `sort_order`),
    CONSTRAINT `content_items_section_foreign`
        FOREIGN KEY (`section_id`) REFERENCES `content_sections` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `content_items_media_foreign`
        FOREIGN KEY (`media_id`) REFERENCES `media` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `navigation_items` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `menu_location` VARCHAR(80) NOT NULL DEFAULT 'primary',
    `parent_id` BIGINT UNSIGNED NULL,
    `label` VARCHAR(120) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `target` ENUM('_self','_blank') NOT NULL DEFAULT '_self',
    `css_class` VARCHAR(190) NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `navigation_location_order_index` (`menu_location`, `sort_order`),
    CONSTRAINT `navigation_parent_foreign`
        FOREIGN KEY (`parent_id`) REFERENCES `navigation_items` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `action` VARCHAR(120) NOT NULL,
    `entity_type` VARCHAR(120) NULL,
    `entity_id` BIGINT UNSIGNED NULL,
    `description` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `metadata_json` LONGTEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `activity_logs_user_index` (`user_id`),
    KEY `activity_logs_entity_index` (`entity_type`, `entity_id`),
    CONSTRAINT `activity_logs_user_foreign`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(190) NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `was_successful` TINYINT(1) NOT NULL DEFAULT 0,
    `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `login_attempts_email_date_index` (`email`, `attempted_at`),
    KEY `login_attempts_ip_date_index` (`ip_address`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscribers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(190) NOT NULL,
    `name` VARCHAR(120) NULL,
    `status` ENUM('pending','active','unsubscribed','blocked') NOT NULL DEFAULT 'active',
    `source` VARCHAR(100) NOT NULL DEFAULT 'website',
    `verification_token_hash` VARCHAR(255) NULL,
    `verified_at` DATETIME NULL DEFAULT NULL,
    `unsubscribed_at` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `subscribers_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `content_sections`
    (`section_key`,`title`,`eyebrow`,`subtitle`,`content`,`button_label`,`button_url`,`sort_order`,`is_enabled`)
VALUES
    ('hero','Todo lo que pasa en tu barrio, en un solo lugar.','El Barrio','Conecta con personas, comercios, servicios y oportunidades cerca de ti.','Una plataforma local que convierte la cercanía en confianza, colaboración y crecimiento.','Descubrir El Barrio','#plataforma',10,1),
    ('problem','La vida local está fragmentada.','El desafío','Información dispersa, comercios invisibles y oportunidades que no llegan a quienes están cerca.',NULL,NULL,NULL,20,1),
    ('platform','Un ecosistema digital para la vida real.','La plataforma','Comunidad, comercio y servicios conectados por proximidad y confianza.',NULL,NULL,NULL,30,1),
    ('marketplace','Compra, vende y encuentra cerca.','Marketplace local','Productos, oficios y servicios ofrecidos por personas y negocios del sector.',NULL,NULL,NULL,40,1),
    ('impact','Cuando el barrio se conecta, todos avanzan.','Impacto','Más circulación local, más confianza y mejores oportunidades.',NULL,NULL,NULL,50,1),
    ('cta','Tu barrio ya está lleno de posibilidades.','Únete','Empieza a descubrirlas, compartirlas y hacerlas crecer.',NULL,'Quiero ser parte','#contacto',60,1)
ON DUPLICATE KEY UPDATE
    `title`=VALUES(`title`),
    `eyebrow`=VALUES(`eyebrow`),
    `subtitle`=VALUES(`subtitle`),
    `content`=VALUES(`content`),
    `button_label`=VALUES(`button_label`),
    `button_url`=VALUES(`button_url`),
    `sort_order`=VALUES(`sort_order`),
    `is_enabled`=VALUES(`is_enabled`);

INSERT INTO `navigation_items`
    (`menu_location`,`label`,`url`,`target`,`sort_order`,`is_enabled`)
VALUES
    ('primary','La idea','#problema','_self',10,1),
    ('primary','Plataforma','#plataforma','_self',20,1),
    ('primary','Marketplace','#marketplace','_self',30,1),
    ('primary','Impacto','#impacto','_self',40,1),
    ('primary','Contacto','#contacto','_self',50,1);

INSERT INTO `settings`
    (`key`,`value`,`type`,`group_name`,`is_public`)
VALUES
    ('site_description','La plataforma digital de tu comunidad local.','string','seo',1),
    ('contact_email','hola@elbarrio.lat','string','contact',1),
    ('contact_phone','','string','contact',1),
    ('social_instagram','','string','social',1),
    ('social_facebook','','string','social',1),
    ('maintenance_mode','0','boolean','system',0)
ON DUPLICATE KEY UPDATE
    `value`=VALUES(`value`),
    `type`=VALUES(`type`),
    `group_name`=VALUES(`group_name`),
    `is_public`=VALUES(`is_public`);

SET FOREIGN_KEY_CHECKS = 1;
