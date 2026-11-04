-- AlterTable
ALTER TABLE `Procedure` ADD COLUMN `equipmentReviewedAt` DATETIME(3) NULL,
    ADD COLUMN `equipmentReviewedById` INTEGER NULL,
    ADD COLUMN `materialsReviewedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Equipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `manufacturer` VARCHAR(120) NULL,
    `model` VARCHAR(120) NULL,
    `serialNumber` VARCHAR(120) NULL,
    `status` ENUM('ACTIVE', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'ACTIVE',
    `shotTracking` ENUM('NONE', 'EQUIPMENT', 'COMPONENT') NOT NULL DEFAULT 'NONE',
    `maintenanceIntervalMonths` INTEGER NOT NULL DEFAULT 12,
    `lastMaintenanceDate` DATE NULL,
    `nextMaintenanceDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Equipment_code_key`(`code`),
    INDEX `Equipment_status_nextMaintenanceDate_idx`(`status`, `nextMaintenanceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentComponent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipmentId` INTEGER NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `serialNumber` VARCHAR(120) NULL,
    `specification` VARCHAR(500) NULL,
    `nominalCapacity` INTEGER NULL,
    `status` ENUM('ACTIVE', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EquipmentComponent_code_key`(`code`),
    INDEX `EquipmentComponent_equipmentId_status_idx`(`equipmentId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProcedureEquipment` (
    `procedureId` INTEGER NOT NULL,
    `equipmentId` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`procedureId`, `equipmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipmentId` INTEGER NOT NULL,
    `componentId` INTEGER NULL,
    `actorId` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `details` JSON NOT NULL,
    `occurredOn` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EquipmentEvent_equipmentId_createdAt_idx`(`equipmentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Procedure` ADD CONSTRAINT `Procedure_equipmentReviewedById_fkey` FOREIGN KEY (`equipmentReviewedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentComponent` ADD CONSTRAINT `EquipmentComponent_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcedureEquipment` ADD CONSTRAINT `ProcedureEquipment_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcedureEquipment` ADD CONSTRAINT `ProcedureEquipment_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentEvent` ADD CONSTRAINT `EquipmentEvent_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentEvent` ADD CONSTRAINT `EquipmentEvent_componentId_fkey` FOREIGN KEY (`componentId`) REFERENCES `EquipmentComponent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentEvent` ADD CONSTRAINT `EquipmentEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- CheckConstraint
-- Enforced by MySQL 8.0.16+; Prisma does not express CHECK constraints in schema.
ALTER TABLE `Equipment`
  ADD CONSTRAINT `Equipment_interval_positive` CHECK (`maintenanceIntervalMonths` BETWEEN 1 AND 120),
  ADD CONSTRAINT `Equipment_maintenance_order` CHECK (`lastMaintenanceDate` IS NULL OR `nextMaintenanceDate` IS NULL OR `nextMaintenanceDate` > `lastMaintenanceDate`);

ALTER TABLE `EquipmentComponent`
  ADD CONSTRAINT `EquipmentComponent_capacity_positive` CHECK (`nominalCapacity` IS NULL OR `nominalCapacity` > 0);
