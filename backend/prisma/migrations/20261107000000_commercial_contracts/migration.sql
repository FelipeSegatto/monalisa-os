-- Commercial contracts and session rights. Existing sales remain LEGACY; no inferred entitlements.

ALTER TABLE `Sale`
  ADD COLUMN `commercialModel` VARCHAR(20) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN `actorId` INTEGER NULL,
  ADD COLUMN `requestKey` VARCHAR(80) NULL,
  ADD COLUMN `requestHash` VARCHAR(64) NULL,
  ADD COLUMN `confirmedAt` DATETIME(3) NULL,
  ADD COLUMN `allowUnpaidUse` BOOLEAN NULL,
  ADD UNIQUE INDEX `Sale_requestKey_key` (`requestKey`);

ALTER TABLE `SaleItem`
  ADD COLUMN `variationId` INTEGER NULL,
  ADD COLUMN `variationName` VARCHAR(140) NULL,
  ADD COLUMN `offerPurchaseId` INTEGER NULL,
  ADD COLUMN `referenceAmount` DECIMAL(12,2) NULL,
  ADD COLUMN `promotionalDiscount` DECIMAL(12,2) NULL,
  ADD COLUMN `negotiatedDiscount` DECIMAL(12,2) NULL,
  ADD COLUMN `netAmount` DECIMAL(12,2) NULL;

ALTER TABLE `SalePayment`
  ADD COLUMN `actorId` INTEGER NULL,
  ADD COLUMN `requestKey` VARCHAR(80) NULL,
  ADD UNIQUE INDEX `SalePayment_requestKey_key` (`requestKey`);

CREATE TABLE `CommercialOffer` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `actorId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommercialOfferVersion` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `offerId` INTEGER NOT NULL,
  `version` INTEGER NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `startsOn` DATE NOT NULL,
  `endsOn` DATE NULL,
  `sessionValidityDays` INTEGER NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `referenceAmount` DECIMAL(12,2) NOT NULL,
  `terms` VARCHAR(2000) NULL,
  `actorId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CommercialOfferVersion_offerId_version_key` (`offerId`,`version`),
  INDEX `CommercialOfferVersion_offerId_startsOn_idx` (`offerId`,`startsOn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommercialOfferItem` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `versionId` INTEGER NOT NULL,
  `procedureId` INTEGER NOT NULL,
  `variationId` INTEGER NULL,
  `procedureName` VARCHAR(150) NOT NULL,
  `variationName` VARCHAR(140) NULL,
  `sessions` INTEGER NOT NULL,
  `referenceUnitPrice` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SaleOfferPurchase` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `saleId` INTEGER NOT NULL,
  `versionId` INTEGER NOT NULL,
  `offerName` VARCHAR(150) NOT NULL,
  `quantity` INTEGER NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SaleDiscount` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `saleId` INTEGER NOT NULL,
  `itemId` INTEGER NULL,
  `kind` VARCHAR(30) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `scope` VARCHAR(20) NOT NULL,
  `value` DECIMAL(12,2) NOT NULL,
  `baseAmount` DECIMAL(12,2) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` VARCHAR(1000) NOT NULL,
  `actorId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SessionEntitlement` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `saleId` INTEGER NOT NULL,
  `saleItemId` INTEGER NOT NULL,
  `customerId` INTEGER NOT NULL,
  `procedureId` INTEGER NOT NULL,
  `variationId` INTEGER NULL,
  `description` VARCHAR(255) NOT NULL,
  `quantity` INTEGER NOT NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SessionEntitlement_saleItemId_key` (`saleItemId`),
  PRIMARY KEY (`id`),
  INDEX `SessionEntitlement_customerId_procedureId_idx` (`customerId`,`procedureId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SessionReservation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `entitlementId` INTEGER NOT NULL,
  `appointmentId` INTEGER NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SessionReservation_appointmentId_key` (`appointmentId`),
  PRIMARY KEY (`id`),
  INDEX `SessionReservation_entitlementId_status_idx` (`entitlementId`,`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SessionRedemption` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `entitlementId` INTEGER NOT NULL,
  `executionId` INTEGER NULL,
  `quantityDelta` INTEGER NOT NULL,
  `actorId` INTEGER NOT NULL,
  `reason` VARCHAR(1000) NULL,
  `requestKey` VARCHAR(100) NOT NULL,
  `reversesId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SessionRedemption_executionId_key` (`executionId`),
  UNIQUE INDEX `SessionRedemption_requestKey_key` (`requestKey`),
  UNIQUE INDEX `SessionRedemption_reversesId_key` (`reversesId`),
  PRIMARY KEY (`id`),
  INDEX `SessionRedemption_entitlementId_createdAt_idx` (`entitlementId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReceivableInstallment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `saleId` INTEGER NOT NULL,
  `number` INTEGER NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `dueOn` DATE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ReceivableInstallment_saleId_number_key` (`saleId`,`number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentAllocation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `paymentId` INTEGER NOT NULL,
  `receivableId` INTEGER NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PaymentAllocation_paymentId_receivableId_key` (`paymentId`,`receivableId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentReversal` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `paymentId` INTEGER NOT NULL,
  `actorId` INTEGER NOT NULL,
  `reason` VARCHAR(1000) NOT NULL,
  `requestKey` VARCHAR(80) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PaymentReversal_paymentId_key` (`paymentId`),
  UNIQUE INDEX `PaymentReversal_requestKey_key` (`requestKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommercialEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `saleId` INTEGER NULL,
  `offerId` INTEGER NULL,
  `type` VARCHAR(50) NOT NULL,
  `reason` VARCHAR(1000) NULL,
  `actorId` INTEGER NOT NULL,
  `details` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `CommercialEvent_saleId_createdAt_idx` (`saleId`,`createdAt`),
  INDEX `CommercialEvent_offerId_createdAt_idx` (`offerId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Sale` ADD CONSTRAINT `Sale_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `ProcedureVariation` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_offerPurchaseId_fkey` FOREIGN KEY (`offerPurchaseId`) REFERENCES `SaleOfferPurchase` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SalePayment` ADD CONSTRAINT `SalePayment_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialOffer` ADD CONSTRAINT `CommercialOffer_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialOfferVersion` ADD CONSTRAINT `CommercialOfferVersion_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `CommercialOffer` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialOfferVersion` ADD CONSTRAINT `CommercialOfferVersion_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialOfferItem` ADD CONSTRAINT `CommercialOfferItem_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `CommercialOfferVersion` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialOfferItem` ADD CONSTRAINT `CommercialOfferItem_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialOfferItem` ADD CONSTRAINT `CommercialOfferItem_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `ProcedureVariation` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleOfferPurchase` ADD CONSTRAINT `SaleOfferPurchase_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleOfferPurchase` ADD CONSTRAINT `SaleOfferPurchase_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `CommercialOfferVersion` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleDiscount` ADD CONSTRAINT `SaleDiscount_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleDiscount` ADD CONSTRAINT `SaleDiscount_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `SaleItem` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleDiscount` ADD CONSTRAINT `SaleDiscount_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionEntitlement` ADD CONSTRAINT `SessionEntitlement_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionEntitlement` ADD CONSTRAINT `SessionEntitlement_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `SaleItem` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionEntitlement` ADD CONSTRAINT `SessionEntitlement_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionEntitlement` ADD CONSTRAINT `SessionEntitlement_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionEntitlement` ADD CONSTRAINT `SessionEntitlement_variationId_fkey` FOREIGN KEY (`variationId`) REFERENCES `ProcedureVariation` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionReservation` ADD CONSTRAINT `SessionReservation_entitlementId_fkey` FOREIGN KEY (`entitlementId`) REFERENCES `SessionEntitlement` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionReservation` ADD CONSTRAINT `SessionReservation_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionRedemption` ADD CONSTRAINT `SessionRedemption_entitlementId_fkey` FOREIGN KEY (`entitlementId`) REFERENCES `SessionEntitlement` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionRedemption` ADD CONSTRAINT `SessionRedemption_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `ProcedureExecution` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionRedemption` ADD CONSTRAINT `SessionRedemption_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SessionRedemption` ADD CONSTRAINT `SessionRedemption_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `SessionRedemption` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `ReceivableInstallment` ADD CONSTRAINT `ReceivableInstallment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `SalePayment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_receivableId_fkey` FOREIGN KEY (`receivableId`) REFERENCES `ReceivableInstallment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `PaymentReversal` ADD CONSTRAINT `PaymentReversal_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `SalePayment` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `PaymentReversal` ADD CONSTRAINT `PaymentReversal_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialEvent` ADD CONSTRAINT `CommercialEvent_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialEvent` ADD CONSTRAINT `CommercialEvent_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `CommercialOffer` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `CommercialEvent` ADD CONSTRAINT `CommercialEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleItem` DROP FOREIGN KEY `SaleItem_saleId_fkey`;
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SaleItem` DROP FOREIGN KEY `SaleItem_procedureId_fkey`;
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_procedureId_fkey` FOREIGN KEY (`procedureId`) REFERENCES `Procedure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `SalePayment` DROP FOREIGN KEY `SalePayment_saleId_fkey`;
ALTER TABLE `SalePayment` ADD CONSTRAINT `SalePayment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE CommercialOfferVersion ADD CONSTRAINT CommercialOfferVersion_valid CHECK (version > 0 AND price >= 0 AND referenceAmount >= price AND (endsOn IS NULL OR endsOn >= startsOn) AND (sessionValidityDays IS NULL OR sessionValidityDays BETWEEN 1 AND 3650));

ALTER TABLE CommercialOfferItem ADD CONSTRAINT CommercialOfferItem_valid CHECK (sessions > 0 AND referenceUnitPrice >= 0);

ALTER TABLE SaleOfferPurchase ADD CONSTRAINT SaleOfferPurchase_valid CHECK (quantity > 0);

ALTER TABLE SaleDiscount ADD CONSTRAINT SaleDiscount_valid CHECK (kind IN ('PROMOTIONAL','NEGOTIATED') AND type IN ('FIXED','PERCENT') AND scope IN ('ITEM','SALE') AND amount > 0 AND amount <= baseAmount AND value > 0 AND (type <> 'PERCENT' OR value <= 100) AND CHAR_LENGTH(TRIM(reason)) >= 3 AND ((scope='ITEM' AND itemId IS NOT NULL) OR (scope='SALE' AND itemId IS NULL)));

ALTER TABLE SessionEntitlement ADD CONSTRAINT SessionEntitlement_valid CHECK (quantity > 0);

ALTER TABLE SessionReservation ADD CONSTRAINT SessionReservation_valid CHECK (status IN ('ACTIVE','RELEASED','REDEEMED'));

ALTER TABLE SessionRedemption ADD CONSTRAINT SessionRedemption_valid CHECK ((quantityDelta=1 AND executionId IS NOT NULL AND reversesId IS NULL) OR (quantityDelta=-1 AND executionId IS NULL AND reversesId IS NOT NULL AND COALESCE(CHAR_LENGTH(TRIM(reason)),0)>=3));

ALTER TABLE ReceivableInstallment ADD CONSTRAINT ReceivableInstallment_valid CHECK (number > 0 AND amount > 0);

ALTER TABLE PaymentAllocation ADD CONSTRAINT PaymentAllocation_valid CHECK (amount > 0);

ALTER TABLE PaymentReversal ADD CONSTRAINT PaymentReversal_valid CHECK (CHAR_LENGTH(TRIM(reason)) >= 3);

ALTER TABLE CommercialEvent ADD CONSTRAINT CommercialEvent_scope CHECK ((saleId IS NOT NULL AND offerId IS NULL) OR (saleId IS NULL AND offerId IS NOT NULL));

ALTER TABLE SaleItem ADD CONSTRAINT SaleItem_contract_amounts CHECK (referenceAmount IS NULL OR (referenceAmount >= 0 AND promotionalDiscount >= 0 AND negotiatedDiscount >= 0 AND netAmount >= 0 AND referenceAmount-promotionalDiscount-negotiatedDiscount=netAmount AND netAmount<=finalPrice AND finalPrice<=referenceAmount));

CREATE TRIGGER `CommercialOfferVersion_immutable_update` BEFORE UPDATE ON `CommercialOfferVersion` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `CommercialOfferVersion_immutable_delete` BEFORE DELETE ON `CommercialOfferVersion` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `CommercialOfferItem_immutable_update` BEFORE UPDATE ON `CommercialOfferItem` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `CommercialOfferItem_immutable_delete` BEFORE DELETE ON `CommercialOfferItem` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SaleOfferPurchase_immutable_update` BEFORE UPDATE ON `SaleOfferPurchase` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SaleOfferPurchase_immutable_delete` BEFORE DELETE ON `SaleOfferPurchase` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SaleItem_immutable_update` BEFORE UPDATE ON `SaleItem` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SaleItem_immutable_delete` BEFORE DELETE ON `SaleItem` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SaleDiscount_immutable_update` BEFORE UPDATE ON `SaleDiscount` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SaleDiscount_immutable_delete` BEFORE DELETE ON `SaleDiscount` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SalePayment_immutable_update` BEFORE UPDATE ON `SalePayment` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SalePayment_immutable_delete` BEFORE DELETE ON `SalePayment` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SessionEntitlement_immutable_update` BEFORE UPDATE ON `SessionEntitlement` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SessionEntitlement_immutable_delete` BEFORE DELETE ON `SessionEntitlement` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SessionRedemption_immutable_update` BEFORE UPDATE ON `SessionRedemption` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `SessionRedemption_immutable_delete` BEFORE DELETE ON `SessionRedemption` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `ReceivableInstallment_immutable_update` BEFORE UPDATE ON `ReceivableInstallment` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `ReceivableInstallment_immutable_delete` BEFORE DELETE ON `ReceivableInstallment` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `PaymentAllocation_immutable_update` BEFORE UPDATE ON `PaymentAllocation` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `PaymentAllocation_immutable_delete` BEFORE DELETE ON `PaymentAllocation` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `PaymentReversal_immutable_update` BEFORE UPDATE ON `PaymentReversal` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `PaymentReversal_immutable_delete` BEFORE DELETE ON `PaymentReversal` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `CommercialEvent_immutable_update` BEFORE UPDATE ON `CommercialEvent` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

CREATE TRIGGER `CommercialEvent_immutable_delete` BEFORE DELETE ON `CommercialEvent` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable commercial record; append a correction';

ALTER TABLE `Sale` ADD CONSTRAINT `Sale_commercial_contract_valid` CHECK (`commercialModel` IN ('LEGACY','V1') AND (`commercialModel`='LEGACY' OR (`allowUnpaidUse` IS NOT NULL AND `actorId` IS NOT NULL AND `confirmedAt` IS NOT NULL AND `requestKey` IS NOT NULL AND `requestHash` IS NOT NULL)));
