-- Limpar tabelas antes (opcional)
DELETE FROM menu_item;
DELETE FROM page_permission;
DELETE FROM profile;

-- =======================
-- Tabela profile
-- =======================
INSERT INTO profile (id, role, createdAt, updatedAt) VALUES
(1, 'ADMIN', NOW(), NOW()),
(2, 'SELLER_MANAGER', NOW(), NOW()),
(3, 'SELLER', NOW(), NOW()),
(4, 'CUSTOMER', NOW(), NOW());



-- =======================
-- Tabela page_permission
-- =======================
-- ADMIN (todas as páginas, '*' como wildcard)
INSERT INTO page_permission (profileId, page, `create`, `read`, `update`, `delete`) VALUES
(1, '*', TRUE, TRUE, TRUE, TRUE);

-- SELLER_MANAGER
INSERT INTO page_permission (profileId, page, `create`, `read`, `update`, `delete`) VALUES
(2, 'category', 0, 1, 0, 0),
(2, 'category/create', 0, 0, 0, 0),
(2, 'category/update', 0, 0, 0, 0),
(2, 'home', 0, 1, 0, 0),
(2, 'product', 0, 1, 0, 0),
(2, 'product/create', 0, 0, 0, 0),
(2, 'product/update', 0, 0, 0, 0),
(2, 'product/one', 0, 0, 0, 0),
(2, 'transformation-workshop', 0, 1, 1, 0),
(2, 'transformation-workshop/create', 0, 0, 0, 0),
(2, 'transformation-workshop/member', 1, 1, 1, 1),
(2, 'transformation-workshop/orders', 1, 1, 1, 1),
(2, 'transformation-workshop/one', 1, 1, 1, 1),
(2, 'transformation-workshop/product', 1, 1, 1, 1),
(2, 'transformation-workshop/update', 1, 1, 1, 1),
(2, 'user', 1, 1, 0, 0),
(2, 'user/create', 1, 1, 0, 0),
(2, 'user/update', 0, 0, 0, 0);


-- SELLER
INSERT INTO page_permission (profileId, page, `create`, `read`, `update`, `delete`) VALUES
(3, 'category', 0, 0, 0, 0),
(3, 'category/create', 0, 0, 0, 0),
(3, 'category/update', 0, 0, 0, 0),
(3, 'home', 0, 1, 0, 0),
(3, 'product', 0, 1, 0, 0),
(3, 'product/create', 0, 0, 0, 0),
(3, 'product/update', 0, 0, 0, 0),
(3, 'product/one', 0, 0, 0, 0),
(3, 'transformation-workshop', 0, 1, 0, 0),
(3, 'transformation-workshop/create', 0, 0, 0, 0),
(3, 'transformation-workshop/member', 1, 1, 1, 1),
(3, 'transformation-workshop/orders', 1, 1, 1, 1),
(3, 'transformation-workshop/one', 1, 1, 1, 1),
(3, 'transformation-workshop/product', 0, 1, 1, 0),
(3, 'transformation-workshop/update', 0, 0, 0, 0),
(3, 'user', 0, 0, 0, 0),
(3, 'user/create', 0, 0, 0, 0),
(3, 'user/update', 0, 0, 0, 0);


-- USER (acesso a todas as páginas como leitura apenas)
INSERT INTO page_permission (profileId, page, `create`, `read`, `update`, `delete`) VALUES
(4, '*', TRUE, TRUE, TRUE, TRUE);

-- =======================
-- Tabela menu_item
-- =======================
-- ADMIN
INSERT INTO menu_item (profileId, label, link, icon, `order`) VALUES
(1, 'Oficinas de Transformações', '/seller/transformation-workshop', 'pi pi-warehouse', 1),
(1, 'Pedidos da OT', '/seller/transformation-workshop/orders', 'pi pi-receipt', 2),
(1, 'Produtos da OT', '/seller/transformation-workshop/product', 'pi pi-th-large', 3),
(1, 'Membros da OT', '/seller/transformation-workshop/member', 'pi pi-users', 4),
(1, 'Categorias', '/seller/category', 'pi pi-sitemap', 5),
(1, 'Produtos', '/seller/product', 'pi pi-th-large', 6),
(1, 'Usuários', '/seller/user', 'pi pi-users', 7);


-- SELLER_MANAGER
INSERT INTO menu_item (profileId, label, link, icon, `order`) VALUES
(2, 'Oficinas de Transformações', '/seller/transformation-workshop', 'pi pi-warehouse', 1),
(2, 'Pedidos da OT', '/seller/transformation-workshop/orders', 'pi pi-receipt', 2),
(2, 'Produtos da OT', '/seller/transformation-workshop/product', 'pi pi-th-large', 3),
(2, 'Membros da OT', '/seller/transformation-workshop/member', 'pi pi-users', 4),
(2, 'Usuários', '/seller/user', 'pi pi-users', 5);


-- SELLER
INSERT INTO menu_item (profileId, label, link, icon, `order`) VALUES
(3, 'Oficinas de Transformações', '/seller/transformation-workshop', 'pi pi-warehouse', 1),
(3, 'Pedidos da OT', '/seller/transformation-workshop/orders', 'pi pi-receipt', 2),
(3, 'Produtos da OT', '/seller/transformation-workshop/product', 'pi pi-th-large', 3),
(3, 'Membros da OT', '/seller/transformation-workshop/member', 'pi pi-users', 4),

