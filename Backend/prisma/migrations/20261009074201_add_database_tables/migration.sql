-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(200) NOT NULL,
    `password` VARCHAR(200) NOT NULL,
    `role` ENUM('admin', 'publisher', 'reader') NOT NULL DEFAULT 'reader',
    `avatar_url` VARCHAR(500) NULL,
    `bio` VARCHAR(500) NULL,
    `verify_token` VARCHAR(255) NULL,
    `verify_token_expiry` DATETIME(3) NULL,
    `reset_token` VARCHAR(255) NULL,
    `reset_token_expiry` DATETIME(3) NULL,
    `refresh_token` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_verify_token_key`(`verify_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Categories_name_key`(`name`),
    UNIQUE INDEX `Categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `author_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `slug` VARCHAR(500) NOT NULL,
    `excerpt` VARCHAR(500) NOT NULL,
    `content` JSON NOT NULL,
    `cover_url` VARCHAR(500) NULL,
    `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    `read_time` INTEGER NOT NULL DEFAULT 1,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notity_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Posts_slug_key`(`slug`),
    INDEX `Posts_status_published_at_idx`(`status`, `published_at`),
    INDEX `Posts_author_id_idx`(`author_id`),
    INDEX `Posts_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriber_id` INTEGER NOT NULL,
    `publisher_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscriptions_publisher_id_idx`(`publisher_id`),
    UNIQUE INDEX `subscriptions_subscriber_id_publisher_id_key`(`subscriber_id`, `publisher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Posts` ADD CONSTRAINT `Posts_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `Categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Posts` ADD CONSTRAINT `Posts_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_subscriber_id_fkey` FOREIGN KEY (`subscriber_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
