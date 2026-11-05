-- Expense attribution is explicit (manual rateio only). Historical paid facts are copied as LEGACY,
-- without inventing actor, method, date, competence or destination for unknowns.

ALTER TABLE `Expense`
  ADD COLUMN `expenseModel` VARCHAR(20) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN `competenceMonth` VARCHAR(7) NULL,
  ADD COLUMN `allocationRevision` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `actorId` INTEGER NULL;

CREATE TABLE `ExpenseRevision` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `expenseId` INTEGER NOT NULL,
  `version` INTEGER NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `category` ENUM('INSUMOS','EQUIPAMENTOS_MANUTENCAO','MARKETING','ALUGUEL_ESTRUTURA','SERVICOS','PESSOAL','OUTROS') NOT NULL,
  `supplier` VARCHAR(190) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `dueDate` DATE NOT NULL,
  `competenceMonth` VARCHAR(7) NOT NULL,
  `recurrence` ENUM('ONCE','RECURRING') NOT NULL,
  `destination` VARCHAR(20) NOT NULL,
  `basis` VARCHAR(20) NOT NULL,
  `allocationNote` VARCHAR(1000) NOT NULL,
  `reason` VARCHAR(1000) NOT NULL,
  `actorId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ExpenseRevision_expenseId_version_key` (`expenseId`,`version`),
  INDEX `ExpenseRevision_expenseId_createdAt_idx` (`expenseId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpenseAllocation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `revisionId` INTEGER NOT NULL,
  `procedureId` INTEGER NULL,
  `procedureName` VARCHAR(150) NULL,
  `inputValue` DECIMAL(12,2) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ExpenseAllocation_procedureId_revisionId_idx` (`procedureId`,`revisionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpensePayment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `expenseId` INTEGER NOT NULL,
  `revisionId` INTEGER NULL,
  `type` VARCHAR(20) NOT NULL,
  `source` VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
  `amount` DECIMAL(12,2) NOT NULL,
  `method` ENUM('PIX','CASH','CARD') NULL,
  `occurredAt` DATETIME(3) NULL,
  `actorId` INTEGER NULL,
  `reason` VARCHAR(1000) NULL,
  `requestKey` VARCHAR(100) NOT NULL,
  `reversesId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ExpensePayment_requestKey_key` (`requestKey`),
  UNIQUE INDEX `ExpensePayment_reversesId_key` (`reversesId`),
  INDEX `ExpensePayment_expenseId_occurredAt_idx` (`expenseId`,`occurredAt`),
  INDEX `ExpensePayment_occurredAt_type_idx` (`occurredAt`,`type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpenseEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `expenseId` INTEGER NOT NULL,
  `type` VARCHAR(40) NOT NULL,
  `actorId` INTEGER NOT NULL,
  `reason` VARCHAR(1000) NULL,
  `requestKey` VARCHAR(80) NOT NULL,
  `requestHash` VARCHAR(64) NOT NULL,
  `details` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ExpenseEvent_requestKey_key` (`requestKey`),
  INDEX `ExpenseEvent_expenseId_createdAt_idx` (`expenseId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Expense` ADD CONSTRAINT `Expense_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `ExpenseRevision` ADD CONSTRAINT `ExpenseRevision_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ExpenseRevision` ADD CONSTRAINT `ExpenseRevision_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `ExpenseAllocation` ADD CONSTRAINT `ExpenseAllocation_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `ExpenseRevision` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ExpenseAllocation` ADD CONSTRAINT `ExpenseAllocation_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `ExpenseRevision` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `ExpensePayment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `ExpenseEvent` ADD CONSTRAINT `ExpenseEvent_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ExpenseEvent` ADD CONSTRAINT `ExpenseEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `Expense` ADD CONSTRAINT `Expense_model_valid` CHECK (`expenseModel` IN ('LEGACY','V1'));

ALTER TABLE `ExpenseRevision` ADD CONSTRAINT `ExpenseRevision_valid` CHECK (
  `version` > 0 AND `amount` > 0
  AND `destination` IN ('GENERAL','PROCEDURES','MIXED')
  AND `basis` IN ('VALUE','PERCENT')
  AND CHAR_LENGTH(TRIM(`reason`)) >= 3
  AND CHAR_LENGTH(TRIM(`allocationNote`)) >= 3
  AND `competenceMonth` REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'
);

ALTER TABLE `ExpenseAllocation` ADD CONSTRAINT `ExpenseAllocation_valid` CHECK (`amount` >= 0);

ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_valid` CHECK (
  `type` IN ('PAYMENT','REVERSAL')
  AND `amount` > 0
  AND ((`type` = 'REVERSAL' AND `reversesId` IS NOT NULL AND COALESCE(CHAR_LENGTH(TRIM(`reason`)),0) >= 3)
       OR (`type` = 'PAYMENT' AND `reversesId` IS NULL))
);

CREATE TRIGGER `ExpenseRevision_immutable_update` BEFORE UPDATE ON `ExpenseRevision` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpenseRevision_immutable_delete` BEFORE DELETE ON `ExpenseRevision` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpenseAllocation_immutable_update` BEFORE UPDATE ON `ExpenseAllocation` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpenseAllocation_immutable_delete` BEFORE DELETE ON `ExpenseAllocation` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpensePayment_immutable_update` BEFORE UPDATE ON `ExpensePayment` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpensePayment_immutable_delete` BEFORE DELETE ON `ExpensePayment` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpenseEvent_immutable_update` BEFORE UPDATE ON `ExpenseEvent` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';
CREATE TRIGGER `ExpenseEvent_immutable_delete` BEFORE DELETE ON `ExpenseEvent` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable audit record; append a correction';

-- Preserve known historical paid facts as an immutable LEGACY payment row; unknown method/date stay NULL.
INSERT INTO `ExpensePayment` (`expenseId`,`type`,`source`,`amount`,`method`,`occurredAt`,`actorId`,`requestKey`,`createdAt`)
SELECT `id`, 'PAYMENT', 'LEGACY', `amount`, `method`, `paidAt`, NULL, CONCAT('legacy:expense:', `id`), COALESCE(`paidAt`, `createdAt`)
FROM `Expense` WHERE `paid` = true;
