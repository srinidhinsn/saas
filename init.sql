--
-- PostgreSQL database dump
--


CREATE TABLE address (
    id bigint NOT NULL,
    address_line1 text,
    address_line2 text,
    city text,
    country text,
    state text,
    pincode text,
    contact_name text,
    contact_number text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 226 (class 1259 OID 49761)
-- Name: address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE address ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME address_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 227 (class 1259 OID 49762)
-- Name: category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE category (
    id text NOT NULL,
    client_id text,
    name text,
    description text,
    sub_categories text[],
    slug text,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 223 (class 1259 OID 49740)
-- Name: client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE client (
    id text NOT NULL,
    name text,
    realm text,
    email text,
    phone text,
    logo text,
    saved_address_ids text[],
    created_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 214 (class 1259 OID 49704)
-- Name: dinein_order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE dinein_order (
    id bigint NOT NULL,
    client_id text,
    dinein_order_id text,
    table_id integer,
    invoice_id text,
    handler_id text,
    invoice_status text,
    price double precision,
    cst double precision,
    gst double precision,
    discount double precision,
    total_price double precision,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status text
);

--
-- TOC entry 215 (class 1259 OID 49711)
-- Name: dineinorder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE dinein_order ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dineinorder_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 49769)
-- Name: document; Type: TABLE; Schema: public; Owner: postgres
--

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
    created_by text,
    last_read_by text,
    created_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

--
-- TOC entry 229 (class 1259 OID 49776)
-- Name: document_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE document_version (
    id text NOT NULL,
    version_no integer,
    url text,
    path text,
    status text,
    category_id text,
    created_by bigint,
    last_read_by bigint,
    created_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_read_date_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 218 (class 1259 OID 49718)
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

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
    availability integer,
    unit text,
    image_id text,
    unit_price double precision,
    unit_cst double precision,
    unit_gst double precision,
    unit_total_price double precision,
    price double precision,
    cst double precision,
    gst double precision,
    discount double precision,
    total_price double precision,
    slug text,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 219 (class 1259 OID 49725)
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE inventory ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 216 (class 1259 OID 49712)
-- Name: order_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE order_item (
    id bigint NOT NULL,
    client_id text,
    order_id bigint,
    item_id bigint,
    item_name text,
    slug text,
    status text,
    quantity integer
);


--
-- TOC entry 217 (class 1259 OID 49717)
-- Name: orderitem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE order_item ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME orderitem_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

ALTER TABLE public.order_item
  ADD COLUMN IF NOT EXISTS unit_price  double precision NULL,
  ADD COLUMN IF NOT EXISTS line_total  double precision NULL;

--
-- TOC entry 221 (class 1259 OID 49734)
-- Name: page_definition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE page_definition (
    id bigint NOT NULL,
    client_id text,
    module text,
    role text,
    screen_id text,
    load_type text,
    operations text[]
);


--
-- TOC entry 222 (class 1259 OID 49739)
-- Name: pagedefinition_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE page_definition ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pagedefinition_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 49747)
-- Name: person; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE person (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text,
    last_name text,
    dob text,
    email text,
    phone text,
    person_type text,
    saved_address_ids bigint[],
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 230 (class 1259 OID 49797)
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE tables (
    id bigint NOT NULL,
    client_id text NOT NULL,
    name text NOT NULL,
    slug text,
    qr_code_url text,
    description text,
    status text DEFAULT 'Vacant'::text,
    section text,
    location_zone text,
    table_type text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 220 (class 1259 OID 49726)
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE "user" (
    username text,
    hashed_password text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text,
    roles text[],
    grants text[]
);


--
-- TOC entry 3401 (class 0 OID 49754)
-- Dependencies: 225
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3403 (class 0 OID 49762)
-- Dependencies: 227
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- TOC entry 3399 (class 0 OID 49740)
-- Dependencies: 223
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO client (id, name, realm, email, phone, logo, saved_address_ids, created_date_time, updated_date_time) VALUES ('easyfood', 'Easy Food Restaurant', 'restaurant', 'easyfood@gmail.com', NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');


--
-- TOC entry 3390 (class 0 OID 49704)
-- Dependencies: 214
-- Data for Name: dinein_order; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO dinein_order (id, client_id, dinein_order_id, table_id, invoice_id, handler_id, invoice_status, price, cst, gst, discount, total_price, created_by, updated_by, created_at, updated_at, status) OVERRIDING SYSTEM VALUE VALUES (1000, 'easyfood', 'order_1', 3, 1, 1000, 'new', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849', 'new');
INSERT INTO dinein_order (id, client_id, dinein_order_id, table_id, invoice_id, handler_id, invoice_status, price, cst, gst, discount, total_price, created_by, updated_by, created_at, updated_at, status) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'order_2', 4, 2, 1000, 'generated', 180, 16, 16, 0, 212, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849', 'preparing');
INSERT INTO dinein_order (id, client_id, dinein_order_id, table_id, invoice_id, handler_id, invoice_status, price, cst, gst, discount, total_price, created_by, updated_by, created_at, updated_at, status) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'order_3', 4, 3, 1000, 'paid', 90, 8, 8, 0, 106, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849', 'served');


--
-- TOC entry 3404 (class 0 OID 49769)
-- Dependencies: 228
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3405 (class 0 OID 49776)
-- Dependencies: 229
-- Data for Name: document_version; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3394 (class 0 OID 49718)
-- Dependencies: 218
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1000, 'easyfood', 1, '{1001,1002}', NULL, 'Veg biriyani', 'tasty veg biriyani', 'Biriyani', 'food', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 10600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 1, NULL, NULL, 'Sherwa', 'Veg gravy', 'Gravy', 'food', 100, 'number', NULL, 10, 9, 9, 28, 1000, 80, 80, 0, 11160, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 1, NULL, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 1, '{1002}', NULL, 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 10600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 1, NULL, NULL, 'Mushroom biriyani', 'Mushroom biriyani without Sherwa', 'Biriyani', 'food', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1009, 'samsung', 1, '{1012}', NULL, 'Screen 5inch', '5inch screen', 'Screen', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1010, 'samsung', 1, '{1011,1013}', NULL, 'Screen 15inch', '15inch screen', 'Screen', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1011, 'samsung', 1, NULL, NULL, 'Wiring 6mm', 'Wiring 6mm', 'Screen', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1012, 'samsung', 1, NULL, NULL, 'Wiring 2mm', 'Wiring 2mm', 'Screen', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1013, 'samsung', 1, '{1014,1015}', NULL, 'PCB sheet', 'PCB sheet', 'Boards', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1014, 'samsung', 1, NULL, NULL, 'transistors', 'PCB sheet', 'Boards', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1015, 'samsung', 1, NULL, NULL, 'capacitor', 'PCB sheet', 'Boards', 'digital', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1016, 'easyfood', 1, NULL, NULL, 'Veg noodles', 'Veg gravy', 'Gravy', 'food', 100, 'number', NULL, 10, 9, 9, 28, 1000, 80, 80, 0, 11160, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1018, 'easyfood', 1, NULL, NULL, 'Raita', 'Plain raitha', 'Raitha', 'food', 100, 'number', NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1019, 'easyfood', 1, '{1002}', NULL, 'Rice bath', 'Plain rice bath', 'Rice', 'food', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 10600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1020, 'easyfood', 1, NULL, NULL, 'Veg noodles', 'Veg noodles', 'chinese_02', 'food', 100, 'number', NULL, 90, 8, 8, 106, 9000, 800, 800, 0, 11600, NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');


--
-- TOC entry 3392 (class 0 OID 49712)
-- Dependencies: 216
-- Data for Name: order_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1000, 'easyfood', 1000, 1000, 'Veg biriyani', NULL, 'served', 1);
INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1001, 'easyfood', 1000, 1004, 'Test data', NULL, 'preparing', 2);
INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1002, 'easyfood', 1000, 1003, 'Test data', NULL, 'served', 1);
INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1003, 'easyfood', 1000, 1004, 'Test data', NULL, 'new', 2);
INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1004, 'easyfood', 1001, 1000, 'Test data', NULL, 'served', 1);
INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1005, 'easyfood', 1001, 1001, 'Test data', NULL, 'served', 1);
INSERT INTO order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity) VALUES (1006, 'easyfood', 1002, 1003, 'Test data', NULL, 'served', 1);


--
-- TOC entry 3397 (class 0 OID 49734)
-- Dependencies: 221
-- Data for Name: page_definition; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'dinein', 'Admin', 'default_dinein', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 'order', 'Admin', 'default_order', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1005, 'easyfood', 'tables', 'Admin', 'default_tables', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'inventory', 'Admin', 'default_inventory', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 'users', 'Admin', 'default_user', 'exclude', '{test}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1006, 'easyfood', 'invoice', 'Admin', 'default_invoice', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1007, 'easyfood', 'menu', 'Admin', 'default_menu', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1008, 'easyfood', 'document', 'Admin', 'default_document', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1009, 'easyfood', 'order_item', 'Admin', 'default_order_items', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1010, 'easyfood', 'order_items', 'Admin', 'default_order_items', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1011, 'easyfood', 'menu', 'Admin2', 'default_menu', 'include', '{ALL}');


--
-- TOC entry 3400 (class 0 OID 49747)
-- Dependencies: 224
-- Data for Name: person; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3406 (class 0 OID 49797)
-- Dependencies: 230
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 3396 (class 0 OID 49726)
-- Dependencies: 220
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "user" (username, hashed_password, id, client_id, roles, grants) VALUES ('admin', '$2b$12$NcusUR2dTlmL/bwUYamZt.QOrGW9.ksrmFSQyx32Lc15VtWfyDPFC', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', 'easyfood', '{Admin}', '{restaurant}');


INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('realm', 'saas', 'Realm', 'Realm of overall application framework', '{restaurant}', '_Realm', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('restaurant', 'saas', 'Restaurant', 'Restaurant realm in saas application', '{dinein,order,menu,inventory,users,tables,invoice,menu,document,order_item,order_items,kds}', '_Realm_Restaurant', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dinein', 'saas', 'Dinein', 'All access to dine in module', '{create,create-sub-order,update,order,table,delete,kds/orders}', '_Realm_Restaurant_Dinein', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order_items', 'saas', 'Order Items', 'All access to order items module', '{update}', '_Realm_Restaurant_Order Items', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order', 'saas', 'Order', 'All access to order module', '{update}', '_Realm_Restaurant_Order', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order_item', 'saas', 'Order item', 'Single order item accessibility', '{update,delete}', '_Realm_Restaurant_Order item', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('menu', 'saas', 'Menu', 'All access related to menu configuration', '{create,update,read,delete,delete_all,read_category,update_category,delete_category,create_category,stock,stock/create,stock/update,recipe}', '_Realm_Restaurant_Menu', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('inventory', 'saas', 'Inventory', 'All access related to menu configuration', '{create,update,read,delete,read_category,update_category,delete_category,create_category}', '_Realm_Restaurant_Inventory', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('tables', 'saas', 'Tables', 'Table management accesses', '{create,update,read,delete}', '_Realm_Restaurant_Tables', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('users', 'saas', 'Users', 'User management accesses', '{register,login,add,reset-password,test,test2,test3,users}', '_Realm_Restaurant_Users', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('invoice', 'saas', 'Billing', 'Billing generation and update service accessibility', '{create,update,read,delete,read_document,update_document,delete_document,create_document,from-order-service,generate,issue}', '_Realm_Restaurant_Billing', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('document', 'saas', 'Document', 'Document storage', '{read,upload,replace,download}', '_Realm_Restaurant_Document', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('kds', 'saas', 'KDS', 'Kitchen Display', '{read,update,delete}', '_Realm_Restaurant_KDS', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');

-- add-user update
UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['person-details', 'persons','realm'])
WHERE id = 'users' AND client_id = 'saas';

-- order-item update
ALTER TABLE "public"."order_item" ADD COLUMN frontend_unique_key TEXT;



ALTER TABLE inventory ADD COLUMN recipe jsonb DEFAULT '[]'::jsonb;
ALTER TABLE inventory ALTER COLUMN availability TYPE numeric(18,6) USING availability::numeric;
ALTER TABLE inventory ADD COLUMN serving_quantity double precision;
ALTER TABLE inventory ADD COLUMN serving_unit text;


CREATE TABLE billing_documents (

    id BIGSERIAL PRIMARY KEY,

    client_id TEXT,

    document_type TEXT,

    document_number TEXT,

    document_date TIMESTAMP,

    due_date TIMESTAMP,

    reference_number TEXT,

    order_id TEXT,

    customer_id TEXT,

    vendor_id TEXT,

    currency TEXT,

    status TEXT,

    contact_email TEXT,

    contact_phone TEXT,

    terms TEXT,

    notes TEXT,

    subtotal DOUBLE PRECISION,

    tax_amount DOUBLE PRECISION,

    discount_amount DOUBLE PRECISION,

    total_amount DOUBLE PRECISION,

    linked_document_ids TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by TEXT,

    updated_by TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    payment_status TEXT DEFAULT 'Pending',

    payment_due_date TIMESTAMP,

    payment_method JSONB,

    payment_reference TEXT,

    approval_status TEXT DEFAULT 'Pending',

    approved_by TEXT,

    approval_date TIMESTAMP,

    gl_account_code TEXT,

    tax_code TEXT,

    accounting_period TEXT,

    currency_conversion_rate DOUBLE PRECISION,

    shipping_address TEXT,

    shipping_method TEXT,

    delivery_date TIMESTAMP,

    tracking_number TEXT,

    document_version INTEGER DEFAULT 1,

    invoice_date TIMESTAMP,

    note TEXT,

    customer_terms TEXT

);

CREATE TABLE billing_document_items (

    id BIGSERIAL PRIMARY KEY,

    document_id BIGINT REFERENCES billing_documents(id) ON DELETE CASCADE,

    item_ref_id TEXT,

    description TEXT,

    quantity DOUBLE PRECISION,

    unit_price DOUBLE PRECISION,

    discount DOUBLE PRECISION,

    tax_rate DOUBLE PRECISION,

    total DOUBLE PRECISION,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW(),

    unit_of_measure TEXT DEFAULT 'Unit',

    item_category TEXT,

    item_discount DOUBLE PRECISION DEFAULT 0.0,

    item_tax_code TEXT DEFAULT 'Standard'

);


CREATE TABLE notifications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    client_id VARCHAR NOT NULL,

    template_name VARCHAR,

    template_body VARCHAR,

    type VARCHAR,

    realm VARCHAR,

    is_read VARCHAR,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);




INSERT INTO category (
  id, client_id, name, description, sub_categories, slug,
  created_by, updated_by, created_at, updated_at
)
VALUES (
  'users',
  'saas',
  'Users',
  'User management accesses',
  ARRAY[
    'register',
    'login',
    'add',
    'reset-password',
    'users',
    'person-details',
    'delegate-access',
    'persons',
    'realm',
    'realms',
    'screens',
    'screens/configure',
    'permissions',
    'permissions/catalog',
    'roles',
    'roles/config'
  ],
  '_Realm_Restaurant_Users',
  NULL,
  NULL,
  '2026-02-02 12:00:00.63831',
  '2026-02-02 12:09:00.87962'
);

ALTER TABLE inventory
ALTER COLUMN inventory_id TYPE TEXT
USING inventory_id::TEXT;




-- Feb 08 2026


ALTER TABLE client
ADD CONSTRAINT client_pk PRIMARY KEY (id);

INSERT INTO client (id, name, realm, email, phone, logo, saved_address_ids, created_date_time, updated_date_time) VALUES ('saas', 'Saas Application', 'all', 'saas@gmail.com', NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');

-- Add composite primary key
ALTER TABLE category
ADD CONSTRAINT category_pk PRIMARY KEY (client_id, id);

-- Add foreign key constraint linking client_id to client.id
ALTER TABLE category
ADD CONSTRAINT category_client_fk
FOREIGN KEY (client_id)
REFERENCES client(id)
ON DELETE CASCADE;


-- Add primary key on (client_id, id) so each order is unique per client
ALTER TABLE dinein_order
ADD CONSTRAINT dinein_order_pk PRIMARY KEY (client_id, id);

-- Add foreign key linking client_id in dinein_order to client.id
ALTER TABLE dinein_order
ADD CONSTRAINT dinein_order_client_fk
FOREIGN KEY (client_id)
REFERENCES client(id)
ON DELETE CASCADE;



ALTER TABLE document
ADD CONSTRAINT document_pk PRIMARY KEY (id, client_id, category_id);


ALTER TABLE inventory
ADD CONSTRAINT inventory_pk PRIMARY KEY (id, inventory_id, client_id);


-- Link client_id in order_item to client.id
ALTER TABLE order_item
ADD CONSTRAINT order_item_client_fk
FOREIGN KEY (client_id)
REFERENCES client(id)
ON DELETE CASCADE;

-- Link item_id in order_item to inventory.id
ALTER TABLE order_item
ADD CONSTRAINT order_item_inventory_fk
FOREIGN KEY (item_id)
REFERENCES inventory(id)
ON DELETE CASCADE;


-- Add composite primary key on (client_id, module, role)
ALTER TABLE page_definition
ADD CONSTRAINT page_definition_pk PRIMARY KEY (client_id, module, role);

-- Add foreign key linking client_id in page_definition to client.id
ALTER TABLE page_definition
ADD CONSTRAINT page_definition_client_fk
FOREIGN KEY (client_id)
REFERENCES client(id)
ON DELETE CASCADE;


-- Add composite primary key on (id, client_id)
ALTER TABLE tables
ADD CONSTRAINT tables_pk PRIMARY KEY (id, client_id);

-- Link client_id in names to client.id
ALTER TABLE tables
ADD CONSTRAINT tables_client_fk
FOREIGN KEY (client_id)
REFERENCES client(id)
ON DELETE CASCADE;


-- Add a new primary key constraint on (id, client_id)
ALTER TABLE "user"
ADD CONSTRAINT user_pk PRIMARY KEY (id, client_id);
-- Link client_id in user to client.id
ALTER TABLE "user"
ADD CONSTRAINT user_client_fk
FOREIGN KEY (client_id)
REFERENCES client(id)
ON DELETE CASCADE;








-- Add composite primary key on (client_id, order_id, frontend_unique_key)
ALTER TABLE order_item
ADD CONSTRAINT order_item_pk PRIMARY KEY (client_id, order_id, frontend_unique_key);


ALTER TABLE inventory
ALTER COLUMN inventory_id TYPE TEXT
USING inventory_id::TEXT;

UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['masters'])
WHERE id = 'inventory' AND client_id = 'saas';

INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('inventory', 'easyfood', 'Inventory', 'Inventory items', '{menu,ration_inventory}', '_Inventory', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('menu', 'easyfood', 'Menu', 'menu items', NULL, '_Inventory_Menu', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('ration_inventory', 'easyfood', 'Ration/Stock', 'stock items', NULL, '_Inventory_Ration/stock', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');


INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('units', 'easyfood', 'Units', 'Units Selection', '{kg, g, litre, ml, pcs}', '_Units', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('kg', 'easyfood', 'Kg', 'Kg Selection', '{}', '_Kg', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('g', 'easyfood', 'Gram', 'gram Selection', '{}', '_G', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('litre', 'easyfood', 'Litre', 'Litre Selection', '{}', '_Litre', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('ml', 'easyfood', 'ML', 'Mililitre Selection', '{}', '_Ml', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('pcs', 'easyfood', 'Pieces', 'Pieces Selection', '{}', '_Pieces', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');

INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('counter', 'easyfood', 'Counters', 'Kitchen Counters', '{}', '_Counter', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');

UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['razorpay','verify'])
WHERE id = 'invoice' AND client_id = 'saas';

CREATE TABLE address (
    id bigint NOT NULL,
    address_line1 text,
    address_line2 text,
    city text,
    name text,
    country text,
    state text,
    pincode text,
    contact_name text,
    contact_number text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['address'])
WHERE id = 'users' AND client_id = 'saas';

CREATE TABLE zone_config (
    id bigint NOT NULL,
    section text,
    zone text,
    client_id text,
    realm text
);

ALTER TABLE inventory ADD COLUMN zone_config_id BIGINT ;
ALTER TABLE zone_config  ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;

INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery', 'easyfood', 'Dietery', 'Dietry type', '{dietery_01,dietery_02,dietery_03,addons,dietery_04}', '_Dietery', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_01', 'easyfood', 'Veg', 'Veg only', NULL, '_Dietery_Veg_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_02', 'easyfood', 'Non-Veg', 'Non veg', NULL, '_Dietery_Non-Veg_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_03', 'easyfood', 'Vegan', 'Jain food', NULL, '_Dietery_Vegan_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('addons', 'easyfood', 'Add-ons', 'Add ons', NULL, '_Dietery_Add-ons_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_04', 'easyfood', 'Eggeterian', 'Egg food', NULL, '_Dietery_Eggeterian_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('roles', 'easyfood', 'Roles', 'Roles definition', '{admin,waiter,receptionist}', '_Roles', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('admin', 'easyfood', 'Admin', 'admin', NULL, '_Roles_Admin', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('waiter', 'easyfood', 'Waiter', 'admin', NULL, '_Roles_Waiter', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('receptionist', 'easyfood', 'Receptionist', 'admin', NULL, '_Roles_Receptionist', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('zone', 'easyfood', 'Zones', 'Zone Selection', '{Ground,First,Second,third}', '_Zones', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('section', 'easyfood', 'Section', 'Section Selection', '{AC,Non-AC}', '_Section', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('status', 'easyfood', 'Status', 'Status Selection', '{Vacant,Occupied,Reserved}', '_Status', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id               BIGSERIAL PRIMARY KEY,
    transaction_id   TEXT,
    client_id        TEXT        NOT NULL,
    stock_item_id    BIGINT      NOT NULL,
    inventory_id     TEXT,
    name             TEXT,
    transaction_type TEXT        NOT NULL,
    movement_type    TEXT        NOT NULL,
    quantity         NUMERIC(18,6) NOT NULL,
	unit             TEXT,
    before_stock     NUMERIC(18,6) NOT NULL,
    after_stock      NUMERIC(18,6) NOT NULL,
    reference_id     TEXT,
    reference_type   TEXT,
    created_by       TEXT,
    created_at       TIMESTAMP   DEFAULT NOW(),
    remarks          TEXT
);

--  April 4 2026 --- Menu Configuration and Available Timings,DIetary_types updates
-- dietary_type row 
INSERT INTO category (id, client_id, name, description, sub_categories, slug,created_by, updated_by, created_at, updated_at)
VALUES ('dietary_type','easyfood','Dietary Type','Dietary Classification','{veg,nonveg,egg,chinese}','_DietaryType','1000','1000',NOW(),NOW());
-- available_timings row 
INSERT INTO category (id, client_id, name, description, sub_categories, slug,created_by, updated_by, created_at, updated_at)
VALUES ('available_timings','easyfood','Availability Time','Food Availability Timings','{}','_AvailabilityTime','1000','1000',NOW(),NOW());
-- user-service
UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['roles'])
WHERE id = 'users' AND client_id = 'saas';
-- table-service
UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['table-types','config'])
WHERE id = 'tables' AND client_id = 'saas';
-- inventory-service
UPDATE category
SET sub_categories = array_cat(sub_categories, ARRAY['item-types'])
WHERE id = 'inventory' AND client_id = 'saas';

ALTER TABLE inventory ALTER COLUMN id DROP DEFAULT;   -- stopping the sequence of inventory table's id
