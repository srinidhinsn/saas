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
    "lineItemId" text[],
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


-- Insert into DineinOrder
INSERT INTO "DineinOrder" ("clientId", "dineinOrderId", "tableNumber", "invoiceId", "handlerId", "invoiceStatus", price, cst, gst, discount, "totalPrice", status)
VALUES 
('easyfood', 'order_1', 3, 1, '1000', 'new', NULL, NULL, NULL, NULL, NULL, 'New'),
('easyfood', 'order_2', 4, 2, '1000', 'generated', 180, 16, 16, 0, 212, 'Preparing'),
('easyfood', 'order_3', 4, 3, '1000', 'paid', 90, 8, 8, 0, 106, 'Served');

-- Insert into OrderItem
INSERT INTO "OrderItem" ("clientId", "orderId", "itemId", quantity)
VALUES 
('easyfood', 1, 1, 1),
('easyfood', 1, 2, 2),
('easyfood', 1, 3, 1),
('easyfood', 1, 4, 2),
('easyfood', 2, 2, 1),
('easyfood', 2, 2, 1),
('easyfood', 3, 3, 1);

-- Insert into Inventory
INSERT INTO "Inventory" ("clientId", "inventoryId", "lineItemId", name, description, category, realm, availability, unit, "unitPrice", "unitCst", "unitGst", "unitTotalPrice", price, cst, gst, discount, "totalPrice")
VALUES 
('easyfood', 1, '{"2","3"}', 'Veg biriyani', 'tasty veg biriyani', 'Biriyani', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),
('easyfood', 1, NULL, 'Sherwa', 'Veg gravy', 'Gravy', 'food', 100, 'number', 10, 9, 9, 28, 1000, 80, 80, 0, 11160),
('easyfood', 1, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', 0, 0, 0, 0, 0, 0, 0, 0, 0),
('easyfood', 1, '{"3"}', 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),
('easyfood', 1, NULL, 'Mushroom biriyani', 'Mushroom biriyani without Sherwa', 'Biriyani', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600);



INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'dinein', 'Admin', 'defaultDinein', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 'order', 'Admin', 'defaultOrder', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'inventory', 'Admin', 'defaultInventory', 'include', '{ALL}');
INSERT INTO "PageDefinition" (id, "clientId", module, role, "screenId", "loadType", operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 'users', 'Admin', 'defaultUser', 'exclude', '{test}');


INSERT INTO "User" (username, hashed_password, id, "clientId", roles, grants) OVERRIDING SYSTEM VALUE VALUES ('admin', '$2b$12$sKBSlLDTo4T7ce3cFk8ffO0LLlFzhkpOkGxFq3P4CcvrLBijZv7Ly', 1000, 'easyfood', '{Admin}', '{dinein,order,inventory,users}');
