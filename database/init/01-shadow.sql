-- Executado somente na primeira criação do volume do MySQL.
-- O usuário agenda_app e o banco agenda_clinica_dev são criados pelo entrypoint oficial.
-- Uma shadow database isolada é usada pelo Prisma Migrate em DESENVOLVIMENTO.
CREATE DATABASE IF NOT EXISTS agenda_clinica_shadow
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON agenda_clinica_shadow.* TO 'agenda_app'@'%';
