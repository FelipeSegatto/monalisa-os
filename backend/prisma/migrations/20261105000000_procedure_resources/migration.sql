-- Review against a copy of the clinic DB before applying. No option IDs are replaced.
ALTER TABLE `Procedure`
  ADD COLUMN `technology` ENUM('GENERAL','HIFU','LASER_HAIR_REMOVAL','TATTOO_REMOVAL') NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN `requiresEquipment` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `ProcedureVariation`
  ADD COLUMN `kind` ENUM('AREA','SIZE','OTHER') NOT NULL DEFAULT 'OTHER';

-- Explicit one-time mapping of the canonical seed records only, NOT runtime name inference.
-- If these procedures were renamed, review IDs and amend the mapping BEFORE first deploy.
UPDATE `Procedure` SET `technology`='HIFU', `requiresEquipment`=true WHERE `name`='Ultrassom Microfocado';
UPDATE `Procedure` SET `technology`='LASER_HAIR_REMOVAL', `requiresEquipment`=true WHERE `name`='Depilação a Laser';
UPDATE `Procedure` SET `technology`='TATTOO_REMOVAL', `requiresEquipment`=true WHERE `name`='Remoção de Tatuagem';
-- Known area and size groups from the seed; Botox's '1 área' is not an anatomical area.
UPDATE `ProcedureVariation` v JOIN `Procedure` p ON p.id=v.procedureId
  SET v.kind='AREA' WHERE p.technology='LASER_HAIR_REMOVAL' AND v.groupName IN ('Face','Corpo');
UPDATE `ProcedureVariation` v JOIN `Procedure` p ON p.id=v.procedureId
  SET v.kind='SIZE' WHERE p.technology='TATTOO_REMOVAL' AND v.groupName='Tamanho';
ALTER TABLE `Procedure`
  ADD CONSTRAINT `Procedure_technology_requires_equipment` CHECK (`technology`='GENERAL' OR `requiresEquipment`=true);
