ALTER TABLE `production`
  ADD COLUMN `produced_quantity` INTEGER NOT NULL DEFAULT 0 AFTER `quantity`;

INSERT INTO `page_permission`
  (`profileId`, `page`, `create`, `read`, `update`, `delete`)
SELECT p.id, 'transformation-workshop/production', TRUE, TRUE, TRUE, FALSE
FROM `profile` p
WHERE p.role IN ('ADMIN', 'SELLER_MANAGER', 'SELLER')
  AND NOT EXISTS (
    SELECT 1
    FROM `page_permission` pp
    WHERE pp.profileId = p.id
      AND pp.page = 'transformation-workshop/production'
  );

INSERT INTO `menu_item` (`profileId`, `label`, `link`, `icon`, `order`)
SELECT p.id, 'Produção da OT', '/seller/transformation-workshop/production', 'pi pi-cog', 3
FROM `profile` p
WHERE p.role IN ('ADMIN', 'SELLER_MANAGER', 'SELLER')
  AND NOT EXISTS (
    SELECT 1
    FROM `menu_item` mi
    WHERE mi.profileId = p.id
      AND mi.link = '/seller/transformation-workshop/production'
  );

UPDATE `menu_item`
SET `order` = `order` + 1
WHERE `link` IN (
  '/seller/transformation-workshop/product',
  '/seller/transformation-workshop/member',
  '/seller/category',
  '/seller/product',
  '/seller/canceled-orders',
  '/seller/user'
);
