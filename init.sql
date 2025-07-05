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

CREATE TABLE inventory (
    id bigint NOT NULL,
    client_id text,
    inventory_id bigint,
    line_item_id bigint[],
    code text,
    name text,
    description text,
    category_id text,
    realm text,
    availability INT,
    unit text,
    image_id text,
    unit_price FLOAT,
    unit_cst FLOAT,
    unit_gst FLOAT,
    unit_total_price FLOAT,
    price FLOAT,
    cst FLOAT,
    gst FLOAT,
    discount FLOAT,
    total_price FLOAT,
    slug text,
    created_by text,
    updated_by text,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE inventory OWNER TO postgres;


ALTER TABLE inventory ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE "user" (
    username text,
    hashed_password text,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id text,
    roles text[],
    grants text[]
);


ALTER TABLE "user" OWNER TO postgres;



CREATE TABLE page_definition (
    id bigint NOT NULL,
    client_id text,
    module text,
    role text,
    screen_id text,
    load_type text,
    operations text[]
);


ALTER TABLE page_definition OWNER TO postgres;

ALTER TABLE page_definition ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pageDefinition_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

CREATE TABLE client (
    id text NOT NULL,
    name text,
    realm text,
    email text,
    phone text,
    logo text,
    saved_address_ids text[],
    created_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE client OWNER TO postgres;




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

CREATE TABLE category (
    id text NOT NULL,
    client_id text,
    name text,
    descriptiontext,
    sub_categories text[],
    slug text,
    created_by bigint,
    updated_by bigint,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE category OWNER TO postgres;


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


CREATE TABLE IF NOT EXISTS public.tables (
    id             BIGINT PRIMARY KEY,
    client_id      TEXT NOT NULL,
    name           TEXT NOT NULL,
    slug           TEXT UNIQUE,
    qr_code_url    TEXT,
    description    TEXT,
    status         TEXT DEFAULT 'Vacant',
    section        TEXT,
    location_zone  TEXT,
    sort_order     INTEGER,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by     TEXT,
    updated_by     TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.tables OWNER TO postgres;

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
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, name, description, category_id, realm, availability, unit, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price)
OVERRIDING SYSTEM VALUE VALUES
(1000, 'easyfood', 1, '{1001,1002}', 'Veg biriyani', 'tasty veg biriyani', 'Biriyani', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),
(1001, 'easyfood', 1, NULL, 'Sherwa', 'Veg gravy', 'Gravy', 'food', 100, 'number', 10, 9, 9, 28, 1000, 80, 80, 0, 11160),
(1002, 'easyfood', 1, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', 0, 0, 0, 0, 0, 0, 0, 0, 0),
(1003, 'easyfood', 1, '{1002}', 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),
(1004, 'easyfood', 1, NULL, 'Mushroom biriyani', 'Mushroom biriyani without Sherwa', 'Biriyani', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1009, 'samsung', 1, '{1012}', 'Screen 5inch', '5inch screen', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1010, 'samsung', 1, '{1011,1013}', 'Screen 15inch', '15inch screen', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1011, 'samsung', 1, NULL, 'Wiring 6mm', 'Wiring 6mm', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1012, 'samsung', 1, NULL, 'Wiring 2mm', 'Wiring 2mm', 'Screen', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1013, 'samsung', 1, '{1014, 1015}', 'PCB sheet', 'PCB sheet', 'Boards', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1014, 'samsung', 1, NULL, 'transistors', 'PCB sheet', 'Boards', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1015, 'samsung', 1, NULL, 'capacitor', 'PCB sheet', 'Boards', 'digital', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600),
(1016, 'easyfood', 1, NULL, 'Veg noodles', 'Veg gravy', 'Gravy', 'food', 100, 'number', 10, 9, 9, 28, 1000, 80, 80, 0, 11160),
(1018, 'easyfood', 1, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', 0, 0, 0, 0, 0, 0, 0, 0, 0),
(1019, 'easyfood', 1, '{1002}', 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 10600),

(1020, 'easyfood', 1, NULL, 'Veg noodles', 'Veg noodles', 'chinese_02', 'food', 100, 'number', 90, 8, 8, 106, 9000, 800, 800, 0, 11600);

INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'dinein', 'Admin', 'default_dinein', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 'order', 'Admin', 'default_order', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1005, 'easyfood', 'tables', 'Admin', 'default_tables', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'inventory', 'Admin', 'default_inventory', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 'users', 'Admin', 'default_user', 'exclude', '{test}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1006, 'easyfood', 'invoice', 'Admin', 'default_invoice', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1007, 'easyfood', 'menu', 'Admin', 'default_menu', 'include', '{ALL}');


--INSERT INTO "user" (username, hashed_password, id, client_id, roles, grants) OVERRIDING SYSTEM VALUE VALUES ('admin', '$2b$12$sKBSlLDTo4T7ce3cFk8ffO0LLlFzhkpOkGxFq3P4CcvrLBijZv7Ly', "", 'easyfood', '{Admin}', '{dinein,order,inventory,users,tables,invoice}');


INSERT INTO category (id, client_id, name, description, sub_categories, created_by, updated_by) OVERRIDING SYSTEM VALUE VALUES 
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