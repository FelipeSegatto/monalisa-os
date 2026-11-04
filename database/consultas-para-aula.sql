-- Execute DEPOIS de criar e aplicar a migration e executar db:demo.
USE agenda_clinica_dev;
SHOW TABLES;
DESCRIBE customers;
SELECT id, name, phone, email, birthDate, acquisitionSource, createdAt
FROM customers ORDER BY id DESC LIMIT 20;
SELECT COUNT(*) AS total_clientes FROM customers;
SELECT id, name, phone FROM customers WHERE name LIKE '%Exemplo%';
-- Demonstração de query com filtro por id; substitua por um id real.
SELECT id, name, phone FROM customers WHERE id = 1;
-- Nunca execute DELETE FROM customers sem WHERE em uma base real.
