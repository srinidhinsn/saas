---------------------------------------------------------------------------------------------------------------------------------
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

ALTER TABLE client ADD CONSTRAINT client_pk PRIMARY KEY (id);
INSERT INTO client (id, name, realm, email, phone, logo, saved_address_ids, created_date_time, updated_date_time) VALUES ('easyfood', 'Easy Food Restaurant', 'restaurant', 'easyfood@gmail.com', NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');

-----------------------------------------------------------------------------------------------------------------------------------

-- user table

CREATE TABLE "user" (
    username text,
    hashed_password text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text,
    roles text[],
    grants text[]
);
ALTER TABLE "user" ADD CONSTRAINT user_pk PRIMARY KEY (id, client_id);
ALTER TABLE "user" ADD CONSTRAINT user_client_fk FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;


--------------------------------------------------------------------------------------------------------
-- tables table
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
ALTER TABLE tables ADD CONSTRAINT tables_pk PRIMARY KEY (id, client_id);
ALTER TABLE tables ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
ALTER TABLE tables ADD CONSTRAINT tables_client_fk FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;

-----------------------------------------------------------------------------------------------------------------------------
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

ALTER TABLE category ADD CONSTRAINT category_pk PRIMARY KEY (client_id, id);

--------------------------------------------------- Important Queries ------------------------------------------------
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('realm', 'saas', 'Realm', 'Realm of overall application framework', '{restaurant}', '_Realm', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('restaurant', 'saas', 'Restaurant', 'Restaurant realm in saas application', '{dinein,order,menu,inventory,users,tables,invoice,menu,document,order_item,order_items,kds}', '_Realm_Restaurant', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dinein', 'saas', 'Dinein', 'All access to dine in module', '{create,create-sub-order,update,order,table,delete,kds/orders}', '_Realm_Restaurant_Dinein', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order_items', 'saas', 'Order Items', 'All access to order items module', '{update}', '_Realm_Restaurant_Order Items', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order', 'saas', 'Order', 'All access to order module', '{update}', '_Realm_Restaurant_Order', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order_item', 'saas', 'Order item', 'Single order item accessibility', '{update,delete}', '_Realm_Restaurant_Order item', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('menu', 'saas', 'Menu', 'All access related to menu configuration', '{create,update,read,delete,delete_all,read_category,update_category,delete_category,create_category,stock,stock/create,stock/update,recipe}', '_Realm_Restaurant_Menu', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('inventory', 'saas', 'Inventory', 'All access related to menu configuration', '{create,update,read,delete,read_category,update_category,delete_category,create_category,masters,item-types}', '_Realm_Restaurant_Inventory', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('tables', 'saas', 'Tables', 'Table management accesses', '{create,update,read,delete,table-types,config}', '_Realm_Restaurant_Tables', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('users', 'saas', 'Users', 'User management accesses', '{register,login,add,reset-password,users,roles,roles/config,permissions,permissions/catelog,screens,screens/configure,
persons,person-details,realm,realms,delete,delegate-access,client,clients,address}', '_Realm_Restaurant_Users', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');

INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('invoice', 'saas', 'Billing', 'Billing generation and update service accessibility', '{create,update,read,delete,read_document,update_document,delete_document,create_document,from-order-service,generate,issue,razorpay,verify}', '_Realm_Restaurant_Billing', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('document', 'saas', 'Document', 'Document storage', '{read,upload,replace,download}', '_Realm_Restaurant_Document', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('kds', 'saas', 'KDS', 'Kitchen Display', '{read,update,delete}', '_Realm_Restaurant_KDS', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
--------------------------------------------------- Important Queries ------------------------------------------------
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

-- dietary_type row 
INSERT INTO category (id, client_id, name, description, sub_categories, slug,created_by, updated_by, created_at, updated_at)
VALUES ('dietary_type','easyfood','Dietary Type','Dietary Classification','{veg,nonveg,egg,chinese}','_DietaryType','1000','1000',NOW(),NOW());
-- available_timings row 
INSERT INTO category (id, client_id, name, description, sub_categories, slug,created_by, updated_by, created_at, updated_at)
VALUES ('available_timings','easyfood','Availability Time','Food Availability Timings','{}','_AvailabilityTime','1000','1000',NOW(),NOW());


-----------------------------------------------------------------------------------------------------------------------------------
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

ALTER TABLE dinein_order ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dineinorder_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);

ALTER TABLE dinein_order ADD CONSTRAINT dinein_order_pk PRIMARY KEY (client_id, id);

ALTER TABLE dinein_order ADD CONSTRAINT dinein_order_client_fk FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;

----------------------------------------------------------------------------------------------------------------------------------
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

ALTER TABLE document ADD CONSTRAINT document_pk PRIMARY KEY (id, client_id, category_id);

-----------------------------------------------------------------------------------------------------------------------------------
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

-----------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE inventory (
    id bigint NOT NULL,
    client_id text,
    inventory_id text,
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
	zone_config_id bigint not null,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE inventory ADD COLUMN recipe jsonb DEFAULT '[]'::jsonb;
ALTER TABLE inventory ALTER COLUMN availability TYPE numeric(18,6) USING availability::numeric;
ALTER TABLE inventory ADD COLUMN serving_quantity double precision;
ALTER TABLE inventory ADD COLUMN serving_unit text;

ALTER TABLE inventory ADD CONSTRAINT inventory_pk PRIMARY KEY (id, inventory_id, client_id);

SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_item';
-----------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE order_item (
    id bigint NOT NULL,
    client_id text,
    order_id bigint,
    item_id bigint,
    item_name text,
    slug text,
    status text,
    quantity integer,
	frontend_unique_key text
);
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

ALTER TABLE order_item ADD CONSTRAINT order_item_client_fk FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;
ALTER TABLE order_item 
ALTER COLUMN frontend_unique_key DROP NOT NULL;

ALTER TABLE order_item 
ADD CONSTRAINT order_item_pk PRIMARY KEY (id);
-----------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE page_definition (
    id bigint NOT NULL,
    client_id text,
    module text,
    role text,
    screen_id text,
    load_type text,
    operations text[]
);
ALTER TABLE page_definition ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME pagedefinition_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);
ALTER TABLE page_definition ADD CONSTRAINT page_definition_pk PRIMARY KEY (client_id, module, role);
ALTER TABLE page_definition ADD CONSTRAINT page_definition_client_fk FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;


INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'dinein', 'Admin', 'default_dinein', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 'order', 'Admin', 'default_order', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1005, 'easyfood', 'tables', 'Admin', 'default_tables', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'inventory', 'Admin', 'default_inventory', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 'users', 'Admin', 'default_user', 'exclude', '{test}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1006, 'easyfood', 'invoice', 'Admin', 'default_invoice', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1007, 'easyfood', 'menu', 'Admin', 'default_menu', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1008, 'easyfood', 'document', 'Admin', 'default_document', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1012, 'easyfood', 'documents', 'Admin', 'default_documents', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1009, 'easyfood', 'order_item', 'Admin', 'default_order_items', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1010, 'easyfood', 'order_items', 'Admin', 'default_order_items', 'include', '{ALL}');
INSERT INTO page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1011, 'easyfood', 'menu', 'Admin2', 'default_menu', 'include', '{ALL}');

-----------------------------------------------------------------------------------------------------------------------------------
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

-----------------------------------------------------------------------------------------------------------------------------------
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

ALTER TABLE billing_documents ALTER COLUMN payment_method TYPE JSONB USING jsonb_build_array(payment_method); 
-----------------------------------------------------------------------------------------------------------------------------------
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

-----------------------------------------------------------------------------------------------------------------------------------
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

-----------------------------------------------------------------------------------------------------------------------------------
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
ALTER TABLE address ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME address_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


---------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE zone_config (
    id bigint NOT NULL,
    section text,
    zone text,
    client_id text,
    realm text
);

ALTER TABLE zone_config  ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;

-----------------------------------------------------------------------------------------------------------------------------------
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

------------------------------             -----------------------------      ---------------------------------------------

INSERT INTO "user" (username, hashed_password, id, client_id, roles, grants) VALUES ('admin', '$2b$12$NcusUR2dTlmL/bwUYamZt.QOrGW9.ksrmFSQyx32Lc15VtWfyDPFC', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', 'easyfood', '{Admin}', '{restaurant}');
ALTER TABLE inventory DROP CONSTRAINT inventory_pk CASCADE;

ALTER TABLE inventory ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME inventory_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);
ALTER TABLE inventory alter column id set generated by default;

-----------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------------------------------------------------------------------------------------------