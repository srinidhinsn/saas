INSERT INTO client (id, name, realm, email, phone, logo, saved_address_ids, created_date_time, updated_date_time) VALUES ('foodyscafe', 'Roti Mane Restaurant', 'restaurant', 'foodyscafe@gmail.com', NULL, NULL, NULL, '2025-09-24 00:58:32.821403', '2025-09-24 00:58:32.821403');
INSERT INTO "user" (username, hashed_password, id, client_id, roles, grants) VALUES ('foodyscafe', '$2b$12$NcusUR2dTlmL/bwUYamZt.QOrGW9.ksrmFSQyx32Lc15VtWfyDPFC', '461e8cc6-a897-59b3-9f0e-1f2e19cd179b', 'foodyscafe', '{Owner}', '{restaurant}');




INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery', 'foodyscafe', 'Dietery', 'Dietry type', '{dietery_01,dietery_02,chinese_03}', '_Dietery', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_01', 'foodyscafe', 'Veg', 'Veg only', NULL, '_Dietery_Veg', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_02', 'foodyscafe', 'Non-Veg', 'Non veg', NULL, '_Dietery_Non-Veg', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('chinese_03', 'foodyscafe', 'Soups', 'Soups special delicious', NULL, NULL, '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('roles', 'foodyscafe', 'Roles', 'Roles definition', '{owner,manager,supervisor}', '_Roles', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('owner', 'foodyscafe', 'Owner', 'owner', NULL, '_Roles_Owner', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('manager', 'foodyscafe', 'Manager', 'manager', NULL, '_Roles_Manager', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('supervisor', 'foodyscafe', 'Supervisor', 'supervisor', NULL, '_Roles_Supervisor', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');




INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'foodyscafe', 'dinein', 'Owner', 'default_dinein', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'foodyscafe', 'order', 'Owner', 'default_order', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1005, 'foodyscafe', 'tables', 'Owner', 'default_tables', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'foodyscafe', 'inventory', 'Owner', 'default_inventory', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'foodyscafe', 'users', 'Owner', 'default_user', 'exclude', '{test}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1006, 'foodyscafe', 'invoice', 'Owner', 'default_invoice', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1007, 'foodyscafe', 'menu', 'Owner', 'default_menu', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1008, 'foodyscafe', 'document', 'Owner', 'default_document', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1009, 'foodyscafe', 'order_item', 'Owner', 'default_order_items', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1010, 'foodyscafe', 'order_items', 'Owner', 'default_order_items', 'include', '{ALL}');



