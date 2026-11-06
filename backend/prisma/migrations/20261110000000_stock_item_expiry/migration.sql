-- Expiry belongs to the receipt event (StockMovement type=IN), not to StockItem itself:
-- two purchases of the same item can expire on different dates. No backfill — historical
-- movements keep expiresAt NULL (unknown), never an invented date.

ALTER TABLE `StockMovement`
  ADD COLUMN `expiresAt` DATE NULL;
