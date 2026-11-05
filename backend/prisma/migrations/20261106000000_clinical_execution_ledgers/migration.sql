-- Validate on an isolated MySQL copy before deploying. No inferred qualifications, schedules or counters.
-- Existing appointments retain their intervals; configure staff capabilities before new bookings.
ALTER TABLE `Professional` ADD COLUMN `schedulingPriority` INTEGER NULL;
ALTER TABLE `Appointment` ADD COLUMN `equipmentId` INTEGER NULL,
 ADD COLUMN `origin` VARCHAR(30) NOT NULL DEFAULT 'INTERNAL', ADD COLUMN `expiresAt` DATETIME(3) NULL;
ALTER TABLE `StockMovement` ADD COLUMN `actorId` INTEGER NULL,
 ADD COLUMN `requestKey` VARCHAR(80) NULL, ADD COLUMN `reversesId` INTEGER NULL,
 ADD UNIQUE INDEX `StockMovement_requestKey_key` (`requestKey`),
 ADD UNIQUE INDEX `StockMovement_reversesId_key` (`reversesId`);

CREATE TABLE `ProfessionalProcedureQualification` (
  `professionalId` INTEGER NOT NULL,
  `procedureId` INTEGER NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ProfessionalProcedureQualification_procedureId_active_idx` (`procedureId`, `active`),
  PRIMARY KEY (`professionalId`, `procedureId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `QualificationChange` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `professionalId` INTEGER NOT NULL,
  `procedureId` INTEGER NOT NULL,
  `active` BOOLEAN NOT NULL,
  `actorId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `QualificationChange_professionalId_createdAt_idx` (`professionalId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProfessionalWorkingPeriod` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `professionalId` INTEGER NOT NULL,
  `weekday` INTEGER NOT NULL,
  `startMinute` INTEGER NOT NULL,
  `endMinute` INTEGER NOT NULL,
  INDEX `ProfessionalWorkingPeriod_professionalId_weekday_idx` (`professionalId`, `weekday`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SchedulingSettings` (
  `id` INTEGER NOT NULL,
  `assignmentPolicy` VARCHAR(30) NOT NULL DEFAULT 'PRIORITY',
  `confirmationMode` VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  `holdMinutes` INTEGER NOT NULL DEFAULT 1440,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Attendance` (
  `cancelledAt` DATETIME(3) NULL,
  `cancellationReason` VARCHAR(1000) NULL,
  `cancelledById` INTEGER NULL,
  `startedById` INTEGER NOT NULL,
  `completedById` INTEGER NULL,
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `appointmentId` INTEGER NULL,
  `customerId` INTEGER NOT NULL,
  `professionalId` INTEGER NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `completionKey` VARCHAR(80) NULL,
  `completionHash` VARCHAR(64) NULL,
  UNIQUE INDEX `Attendance_appointmentId_key` (`appointmentId`),
  UNIQUE INDEX `Attendance_completionKey_key` (`completionKey`),
  INDEX `Attendance_customerId_startedAt_idx` (`customerId`, `startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProcedureExecution` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `attendanceId` INTEGER NOT NULL,
  `procedureId` INTEGER NOT NULL,
  `variationId` INTEGER NULL,
  `professionalId` INTEGER NOT NULL,
  `equipmentId` INTEGER NULL,
  `procedureName` VARCHAR(150) NOT NULL,
  `variationName` VARCHAR(140) NULL,
  `technology` ENUM('GENERAL','HIFU','LASER_HAIR_REMOVAL','TATTOO_REMOVAL') NOT NULL,
  INDEX `ProcedureExecution_procedureId_attendanceId_idx` (`procedureId`, `attendanceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaterialUsage` (
  `usage` VARCHAR(20) NOT NULL,
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `executionId` INTEGER NOT NULL,
  `stockItemId` INTEGER NOT NULL,
  `materialName` VARCHAR(150) NOT NULL,
  UNIQUE INDEX `MaterialUsage_executionId_stockItemId_key` (`executionId`, `stockItemId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShotLedgerEntry` (
  `replacesId` INTEGER NULL,
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `equipmentId` INTEGER NOT NULL,
  `componentId` INTEGER NULL,
  `executionId` INTEGER NULL,
  `type` VARCHAR(30) NOT NULL,
  `quantityDelta` INTEGER NOT NULL,
  `actorId` INTEGER NOT NULL,
  `reason` VARCHAR(1000) NULL,
  `requestKey` VARCHAR(100) NOT NULL,
  `reversesId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ShotLedgerEntry_replacesId_key` (`replacesId`),
  UNIQUE INDEX `ShotLedgerEntry_requestKey_key` (`requestKey`),
  UNIQUE INDEX `ShotLedgerEntry_reversesId_key` (`reversesId`),
  INDEX `ShotLedgerEntry_equipmentId_componentId_createdAt_idx` (`equipmentId`, `componentId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProfessionalProcedureQualification` ADD CONSTRAINT `ProfessionalProcedureQualification_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ProfessionalProcedureQualification` ADD CONSTRAINT `ProfessionalProcedureQualification_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `QualificationChange` ADD CONSTRAINT `QualificationChange_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `QualificationChange` ADD CONSTRAINT `QualificationChange_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `QualificationChange` ADD CONSTRAINT `QualificationChange_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ProfessionalWorkingPeriod` ADD CONSTRAINT `ProfessionalWorkingPeriod_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ProcedureExecution` ADD CONSTRAINT `ProcedureExecution_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ProcedureExecution` ADD CONSTRAINT `ProcedureExecution_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ProcedureExecution` ADD CONSTRAINT `ProcedureExecution_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `ProcedureVariation` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ProcedureExecution` ADD CONSTRAINT `ProcedureExecution_professionalId_fkey` FOREIGN KEY (`professionalId`) REFERENCES `Professional` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ProcedureExecution` ADD CONSTRAINT `ProcedureExecution_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MaterialUsage` ADD CONSTRAINT `MaterialUsage_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `ProcedureExecution` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MaterialUsage` ADD CONSTRAINT `MaterialUsage_stockItemId_fkey` FOREIGN KEY (`stockItemId`) REFERENCES `StockItem` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_componentId_fkey` FOREIGN KEY (`componentId`) REFERENCES `EquipmentComponent` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `ProcedureExecution` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `ShotLedgerEntry` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `StockMovement` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `Professional` ADD CONSTRAINT `Professional_priority_nonnegative` CHECK (`schedulingPriority` IS NULL OR `schedulingPriority` >= 0);
ALTER TABLE `ProfessionalWorkingPeriod` ADD CONSTRAINT `WorkingPeriod_valid` CHECK (`weekday` BETWEEN 0 AND 6 AND `startMinute` >= 0 AND `endMinute` <= 1440 AND `startMinute` < `endMinute`);
ALTER TABLE `SchedulingSettings` ADD CONSTRAINT `SchedulingSettings_valid` CHECK (`id` = 1 AND `assignmentPolicy` IN ('PRIORITY','MANUAL') AND `confirmationMode` IN ('MANUAL','AUTOMATIC') AND `holdMinutes` BETWEEN 5 AND 10080);
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_status_valid` CHECK ((`status` = 'IN_PROGRESS' AND `completedAt` IS NULL AND `completionKey` IS NULL AND `completionHash` IS NULL AND `cancelledAt` IS NULL) OR (`status` = 'COMPLETED' AND `completedAt` >= `startedAt` AND `completionKey` IS NOT NULL AND `completionHash` IS NOT NULL AND `cancelledAt` IS NULL) OR (`status` = 'CANCELLED' AND `cancelledAt` >= `startedAt` AND COALESCE(CHAR_LENGTH(TRIM(`cancellationReason`)),0) >= 3 AND `completedAt` IS NULL AND `completionKey` IS NULL AND `completionHash` IS NULL));
ALTER TABLE `MaterialUsage` ADD CONSTRAINT `MaterialUsage_valid` CHECK (`usage` IN ('USED','SMALL','NOT_USED'));
ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_valid` CHECK ((`quantityDelta` <> 0 OR (`type` = 'OPENING' AND `quantityDelta` = 0)) AND `type` IN ('CONSUMPTION','OPENING','ADJUSTMENT','REVERSAL') AND (`type` <> 'CONSUMPTION' OR (`quantityDelta` > 0 AND `executionId` IS NOT NULL)) AND (`type` <> 'OPENING' OR `quantityDelta` >= 0) AND (`type` = 'CONSUMPTION' OR COALESCE(CHAR_LENGTH(TRIM(`reason`)),0) > 0) AND ((`type` = 'REVERSAL' AND `reversesId` IS NOT NULL) OR (`type` <> 'REVERSAL' AND `reversesId` IS NULL)) AND (`replacesId` IS NULL OR (`type` = 'CONSUMPTION' AND COALESCE(CHAR_LENGTH(TRIM(`reason`)),0) > 0)));
-- Legacy stock movements remain intact. Constraints on existing stock need a separate data audit.

CREATE TRIGGER `ShotLedgerEntry_immutable_update` BEFORE UPDATE ON `ShotLedgerEntry` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ShotLedgerEntry_immutable_delete` BEFORE DELETE ON `ShotLedgerEntry` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `StockMovement_immutable_update` BEFORE UPDATE ON `StockMovement` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `StockMovement_immutable_delete` BEFORE DELETE ON `StockMovement` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `MaterialUsage_immutable_update` BEFORE UPDATE ON `MaterialUsage` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `MaterialUsage_immutable_delete` BEFORE DELETE ON `MaterialUsage` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ProcedureExecution_immutable_update` BEFORE UPDATE ON `ProcedureExecution` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ProcedureExecution_immutable_delete` BEFORE DELETE ON `ProcedureExecution` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `QualificationChange_immutable_update` BEFORE UPDATE ON `QualificationChange` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `QualificationChange_immutable_delete` BEFORE DELETE ON `QualificationChange` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';

CREATE INDEX `Appointment_equipmentId_startsAt_endsAt_idx` ON `Appointment` (`equipmentId`,`startsAt`,`endsAt`);
CREATE INDEX `Appointment_status_expiresAt_idx` ON `Appointment` (`status`,`expiresAt`);

ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_startedById_fkey` FOREIGN KEY (`startedById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_cancelledById_fkey` FOREIGN KEY (`cancelledById`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ShotLedgerEntry` ADD CONSTRAINT `ShotLedgerEntry_replacesId_fkey` FOREIGN KEY (`replacesId`) REFERENCES `ShotLedgerEntry` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `StockMovement` DROP FOREIGN KEY `StockMovement_stockItemId_fkey`;
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_stockItemId_fkey` FOREIGN KEY (`stockItemId`) REFERENCES `StockItem` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
