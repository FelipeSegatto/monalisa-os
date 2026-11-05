-- Preserve the administrator's current policy; the new mode is opt-in.
ALTER TABLE `SchedulingSettings` ADD COLUMN `lastBalancedProfessionalId` INTEGER NULL;
ALTER TABLE `SchedulingSettings` DROP CHECK `SchedulingSettings_valid`;
ALTER TABLE `SchedulingSettings` ADD CONSTRAINT `SchedulingSettings_valid` CHECK (
  `id` = 1 AND `assignmentPolicy` IN ('PRIORITY','BALANCED','MANUAL')
  AND `confirmationMode` IN ('MANUAL','AUTOMATIC') AND `holdMinutes` BETWEEN 5 AND 10080
  AND (`lastBalancedProfessionalId` IS NULL OR `lastBalancedProfessionalId` > 0)
);
