CREATE TABLE "DineinOrder" (
    id bigint NOT NULL,
    "clientId" text,
    "dineinOrderId" text,
    "tableNumber" int,
    "invoiceId" bigint,
    "handlerId" bigint,
    "invoiceStatus" text,
    price FLOAT,
    cst FLOAT,
    gst FLOAT,
    discount FLOAT,
    "totalPrice" FLOAT,
    "createdBy" text,
    "updatedBy" text,
    "createdDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status text
);

ALTER TABLE "DineinOrder" OWNER TO postgres;


ALTER TABLE "DineinOrder" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dineinOrder_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE "OrderItem" (
    id bigint NOT NULL,
    "clientId" text,
    "orderId" bigint,
    "itemId" bigint,
	status text,
    quantity INT
);

ALTER TABLE "OrderItem" OWNER TO postgres;


ALTER TABLE "OrderItem" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME orderItem_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE "Inventory" (
    id bigint NOT NULL,
    "clientId" text,
    "inventoryId" bigint,
    "lineItemId" bigint[],
    name text,
    description text,
    category text,
    realm text,
    availability INT,
    unit text,
    "unitPrice" FLOAT,
    "unitCst" FLOAT,
    "unitGst" FLOAT,
    "unitTotalPrice" FLOAT,
    price FLOAT,
    cst FLOAT,
    gst FLOAT,
    discount FLOAT,
    "totalPrice" FLOAT,
    "createdBy" text,
    "updatedBy" text,
    "createdDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Inventory" OWNER TO postgres;


ALTER TABLE "Inventory" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE "User" (
    username text,
    hashed_password text,
    id bigint NOT NULL,
    "clientId" text,
    roles text[],
    grants text[]
);


ALTER TABLE "User" OWNER TO postgres;

ALTER TABLE "User" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME user_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);



CREATE TABLE "PageDefinition" (
    id bigint NOT NULL,
    "clientId" text,
    module text,
    role text,
    "screenId" text,
    "loadType" text,
    operations text[]
);


ALTER TABLE "PageDefinition" OWNER TO postgres;

ALTER TABLE "PageDefinition" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pageDefinition_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE "Client" (
    id text NOT NULL,
    "name" text,
    realm text,
    email text,
    phone text,
    logo text,
    "savedAddressIds" text[],
    "createdDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "Client" OWNER TO postgres;




CREATE TABLE "Person" (
    id text NOT NULL,
    "firstName" text,
    "lastName" text,
    dob text,
    email text,
    phone text,
    "personType" text,
    "savedAddressIds" bigint[],
    "createdDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "Person" OWNER TO postgres;




CREATE TABLE "Address" (
    id bigint NOT NULL,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    country text,
    "state" text,
    pincode text,
    "contactName" text,
    "contactNumber" text,
    "createdDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "Address" OWNER TO postgres;

ALTER TABLE "Address" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME address_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE "Category" (
    id text NOT NULL,
    "clientId" text,
    "name" text,
    "description" text,
    "subCategories" text[],
    "createdBy" bigint,
    "updatedBy" bigint,
    "createdDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedDateTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "Category" OWNER TO postgres;


CREATE TABLE document (
    id text NOT NULL,
    client_id text,
    category_id text,
    name text,
    description text,
    is_protected boolean,
    realm text,
    url text,
    path text,
    is_active boolean,
    created_by bigint,
    last_read_by bigint,
    created_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE document OWNER TO postgres;

CREATE TABLE document_version (
    id text NOT NULL,
    version_no int,
    url text,
    path text,
    status text,
    created_by bigint,
    last_read_by bigint,
    created_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE document_version OWNER TO postgres;





-- Insert into DineinOrder
INSERT INTO "DineinOrder" ("id", "clientId", "dineinOrderId", "tableNumber", "invoiceId", "handlerId", "invoiceStatus", price, cst, gst, discount, "totalPrice", status)
OVERRIDING SYSTEM VALUE VALUES
(1000, 'easyfood', 'order_1', 3, 1, '1000', 'new', NULL, NULL, NULL, NULL, NULL, 'New'),
(1001, 'easyfood', 'order_2', 4, 2, '1000', 'generated', 180, 16, 16, 0, 212, 'Preparing'),
(1002, 'easyfood', 'order_3', 4, 3, '1000', 'paid', 90, 8, 8, 0, 106, 'Served');

-- Insert into OrderItem
INSERT INTO "OrderItem" ("id", "clientId", "orderId", "itemId", quantity, status)
OVERRIDING SYSTEM VALUE VALUES
(1000, 'easyfood', 1000, 1000, 1, 'Served'),
(1001, 'easyfood', 1000, 1004, 2, 'Preparing'),
(1002, 'easyfood', 1000, 1003, 1, 'Served'),
(1003, 'easyfood', 1000, 1004, 2, 'New'),
(1004, 'easyfood', 1001, 1000, 1, 'Served'),
(1005, 'easyfood', 1001, 1001, 1, 'Served'),
(1006, 'easyfood', 1002, 1003, 1, 'Served');

-- Insert into Inventory
INSERT INTO "Inventory" ("id", "clientId", "inventoryId", "lineItemId", name, description, category, realm, availability, unit, "unitPrice", "unitCst", "unitGst", "unitTotalPrice", price, cst, gst, discount, "totalPrice")
OVERRIDING SYSTEM VALUE VALUES
(1000, 'easyfood', 1, '{1001,1002}', 'Veg biriyani', 'tasty veg biriyani', 'Biriyani', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),
(1001, 'easyfood', 1, NULL, 'Sherwa', 'Veg gravy', 'Gravy', 'food', 100, 'number', 10, 9, 9, 28, 1000, 80, 80, 0, 11160),
(1002, 'easyfood', 1, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', 0, 0, 0, 0, 0, 0, 0, 0, 0),
(1003, 'easyfood', 1, '{1002}', 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),
(1004, 'easyfood', 1, NULL, 'Mushroom biriyani', 'Mushroom biriyani without Sherwa', 'Biriyani', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600);



(1009, 'samsung', 1, '{1012}', 'Screen 5inch', '5inch screen', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1010, 'samsung', 1, '{1011,1013}', 'Screen 15inch', '15inch screen', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1011, 'samsung', 1, NULL, 'Wiring 6mm', 'Wiring 6mm', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1012, 'samsung', 1, NULL, 'Wiring 2mm', 'Wiring 2mm', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1013, 'samsung', 1, '{1014, 1015}', 'PCB sheet', 'PCB sheet', 'Boards', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1014, 'samsung', 1, NULL, 'transistors', 'PCB sheet', 'Boards', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1015, 'samsung', 1, NULL, 'capacitor', 'PCB sheet', 'Boards', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600);


(1016, 'easyfood', 1, NULL, 'Veg noodles', 'Veg gravy', 'Gravy', 'food', 100, 'number', 10, 9, 9, 28, 1000, 80, 80, 0, 11160),
(1018, 'easyfood', 1, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', 0, 0, 0, 0, 0, 0, 0, 0, 0),
(1019, 'easyfood', 1, '{1002}', 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),

(1020, 'easyfood', 1, NULL, 'Veg noodles', 'Veg noodles', 'chinese_02', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600);

INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'dinein', 'Admin', 'defaultDinein', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 'order', 'Admin', 'defaultOrder', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1005, 'easyfood', 'tables', 'Admin', 'defaultTables', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'inventory', 'Admin', 'defaultInventory', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 'users', 'Admin', 'defaultUser', 'exclude', '{test}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1006, 'easyfood', 'invoice', 'Admin', 'defaultInvoice', 'include', '{ALL}');


INSERT INTO "User" (username, hashed_password, id, "clientId", roles, grants) OVERRIDING SYSTEM VALUE VALUES ('admin', '$2b$12$sKBSlLDTo4T7ce3cFk8ffO0LLlFzhkpOkGxFq3P4CcvrLBijZv7Ly', 1000, 'easyfood', '{Admin}', '{dinein,order,inventory,users,tables,invoice}');


INSERT INTO "Category" (id, "clientId", "name", "description", "subCategories", "createdBy", "updatedBy") OVERRIDING SYSTEM VALUE VALUES 
('chinese_01', 'easyfood', 'Chinese', 'Chinese delicious', '{"chinese_02", "chinese_03"}', '1000', '1000'),
('chinese_02', 'easyfood', 'Noodles', 'Noodles special delicious',null, '1000', '1000'),
('chinese_03', 'easyfood', 'Soups', 'Soups special delicious',null, '1000', '1000'),
('northindian_01', 'easyfood', 'North Indian', 'North Indian Special', '{"northindian_meals_02", "northindian_breads_03", "northindian_gravy_04"}', '1000', '1000'),
('northindian_meals_02', 'easyfood', 'North Meals', 'Unlimited north means', null, '1000', '1000'),
('northindian_breads_03', 'easyfood', 'Breads', 'All roti and naans', null, '1000', '1000'),
('northindian_gravy_04', 'easyfood', 'Gravy', 'All gravies of north indian style', '{"northindian_veg_05", "northindian_non_veg_06"}', '1000', '1000'),
('northindian_veg_05', 'easyfood', 'Veg', 'Veg only', null, '1000', '1000'),
('northindian_non_veg_06', 'easyfood', 'Non-Veg', 'Non vegeterian', null, '1000', '1000'),
('l_bit_rod_01', 'ram_manufacturing', 'L_BIT_ROD', 'All bit rods', '{"red_wire_01", "switch_01"}', '1000', '1000'),
('red_wire_01', 'ram_manufacturing', 'RED_WIRE', 'All red wires', null, '1000', '1000'),
('switch_01', 'ram_manufacturing', 'SWITCH', 'All switches', null, '1000', '1000'),
('switch_02', 'ram_manufacturing', 'DP SWITCH', 'All switches','{"red_wire_01"}' , '1000', '1000')
;