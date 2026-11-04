-- ALTERNATIVA SEM DOCKER. Execute como administrador no MySQL Workbench.
-- Troque a senha nos SQL e .env antes de usar em qualquer máquina compartilhada.
CREATE DATABASE IF NOT EXISTS agenda_clinica_dev
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS agenda_clinica_shadow
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'agenda_app'@'localhost' IDENTIFIED BY 'agenda_dev_123';
GRANT ALL PRIVILEGES ON agenda_clinica_dev.* TO 'agenda_app'@'localhost';
GRANT ALL PRIVILEGES ON agenda_clinica_shadow.* TO 'agenda_app'@'localhost';
-- Edite no backend/.env as portas 3307 -> 3306 caso use instalação local padrão.
