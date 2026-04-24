--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2026-04-23 12:45:13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4965 (class 1262 OID 21070)
-- Name: saas_dev; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE saas_dev WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';


ALTER DATABASE saas_dev OWNER TO postgres;

\connect saas_dev

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 237 (class 1259 OID 21252)
-- Name: address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address (
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


ALTER TABLE public.address OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 21259)
-- Name: address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.address ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.address_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 235 (class 1259 OID 21223)
-- Name: billing_document_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_document_items (
    id bigint NOT NULL,
    document_id bigint,
    item_ref_id text,
    description text,
    quantity double precision,
    unit_price double precision,
    discount double precision,
    tax_rate double precision,
    total double precision,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    unit_of_measure text DEFAULT 'Unit'::text,
    item_category text,
    item_discount double precision DEFAULT 0.0,
    item_tax_code text DEFAULT 'Standard'::text
);


ALTER TABLE public.billing_document_items OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 21222)
-- Name: billing_document_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_document_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billing_document_items_id_seq OWNER TO postgres;

--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 234
-- Name: billing_document_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_document_items_id_seq OWNED BY public.billing_document_items.id;


--
-- TOC entry 233 (class 1259 OID 21202)
-- Name: billing_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_documents (
    id bigint NOT NULL,
    client_id text,
    document_type text,
    document_number text,
    document_date timestamp without time zone,
    due_date timestamp without time zone,
    reference_number text,
    order_id text,
    customer_id text,
    vendor_id text,
    currency text,
    status text,
    contact_email text,
    contact_phone text,
    terms text,
    notes text,
    subtotal double precision,
    tax_amount double precision,
    discount_amount double precision,
    total_amount double precision,
    linked_document_ids text,
    is_active boolean DEFAULT true NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    payment_status text DEFAULT 'Pending'::text,
    payment_due_date timestamp without time zone,
    payment_method jsonb,
    payment_reference text,
    approval_status text DEFAULT 'Pending'::text,
    approved_by text,
    approval_date timestamp without time zone,
    gl_account_code text,
    tax_code text,
    accounting_period text,
    currency_conversion_rate double precision,
    shipping_address text,
    shipping_method text,
    delivery_date timestamp without time zone,
    tracking_number text,
    document_version integer DEFAULT 1,
    invoice_date timestamp without time zone,
    note text,
    customer_terms text
);


ALTER TABLE public.billing_documents OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 21201)
-- Name: billing_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billing_documents_id_seq OWNER TO postgres;

--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 232
-- Name: billing_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_documents_id_seq OWNED BY public.billing_documents.id;


--
-- TOC entry 221 (class 1259 OID 21110)
-- Name: category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category (
    id text NOT NULL,
    client_id text NOT NULL,
    name text,
    description text,
    sub_categories text[],
    slug text,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.category OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 21071)
-- Name: client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client (
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


ALTER TABLE public.client OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 21119)
-- Name: dinein_order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dinein_order (
    id bigint NOT NULL,
    client_id text NOT NULL,
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


ALTER TABLE public.dinein_order OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 21126)
-- Name: dineinorder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.dinein_order ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dineinorder_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 21134)
-- Name: document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document (
    id text NOT NULL,
    client_id text NOT NULL,
    category_id text NOT NULL,
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


ALTER TABLE public.document OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 21143)
-- Name: document_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_version (
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


ALTER TABLE public.document_version OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 21150)
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id bigint NOT NULL,
    client_id text NOT NULL,
    inventory_id text NOT NULL,
    line_item_id bigint[],
    code text,
    name text,
    description text,
    category_id text,
    realm text,
    availability numeric(18,6),
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
    zone_config_id bigint NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    recipe jsonb DEFAULT '[]'::jsonb,
    serving_quantity double precision,
    serving_unit text
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 21276)
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inventory_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 242 (class 1259 OID 21267)
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_transactions (
    id bigint NOT NULL,
    transaction_id text,
    client_id text NOT NULL,
    stock_item_id bigint NOT NULL,
    inventory_id text,
    name text,
    transaction_type text NOT NULL,
    movement_type text NOT NULL,
    quantity numeric(18,6) NOT NULL,
    unit text,
    before_stock numeric(18,6) NOT NULL,
    after_stock numeric(18,6) NOT NULL,
    reference_id text,
    reference_type text,
    created_by text,
    created_at timestamp without time zone DEFAULT now(),
    remarks text
);


ALTER TABLE public.inventory_transactions OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 21266)
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_transactions_id_seq OWNER TO postgres;

--
-- TOC entry 4968 (class 0 OID 0)
-- Dependencies: 241
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- TOC entry 236 (class 1259 OID 21242)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying NOT NULL,
    template_name character varying,
    template_body character varying,
    type character varying,
    realm character varying,
    is_read character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 21165)
-- Name: order_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_item (
    id bigint NOT NULL,
    client_id text,
    order_id bigint,
    item_id bigint,
    item_name text,
    slug text,
    status text,
    quantity integer,
    frontend_unique_key text,
    unit_price double precision,
    line_total double precision
);


ALTER TABLE public.order_item OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 21170)
-- Name: orderitem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.order_item ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.orderitem_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 229 (class 1259 OID 21178)
-- Name: page_definition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_definition (
    id bigint NOT NULL,
    client_id text NOT NULL,
    module text NOT NULL,
    role text NOT NULL,
    screen_id text,
    load_type text,
    operations text[]
);


ALTER TABLE public.page_definition OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 21183)
-- Name: pagedefinition_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.page_definition ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pagedefinition_id_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 1000000000000
    CACHE 1
);


--
-- TOC entry 231 (class 1259 OID 21191)
-- Name: person; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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


ALTER TABLE public.person OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 21093)
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tables (
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


ALTER TABLE public.tables OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 21104)
-- Name: tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.tables ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 218 (class 1259 OID 21080)
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    username text,
    hashed_password text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    roles text[],
    grants text[]
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 21260)
-- Name: zone_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zone_config (
    id bigint NOT NULL,
    section text,
    zone text,
    client_id text,
    realm text
);


ALTER TABLE public.zone_config OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 21265)
-- Name: zone_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.zone_config ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.zone_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4742 (class 2604 OID 21226)
-- Name: billing_document_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_document_items ALTER COLUMN id SET DEFAULT nextval('public.billing_document_items_id_seq'::regclass);


--
-- TOC entry 4735 (class 2604 OID 21205)
-- Name: billing_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_documents ALTER COLUMN id SET DEFAULT nextval('public.billing_documents_id_seq'::regclass);


--
-- TOC entry 4754 (class 2604 OID 21270)
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- TOC entry 4953 (class 0 OID 21252)
-- Dependencies: 237
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4951 (class 0 OID 21223)
-- Dependencies: 235
-- Data for Name: billing_document_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4949 (class 0 OID 21202)
-- Dependencies: 233
-- Data for Name: billing_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4937 (class 0 OID 21110)
-- Dependencies: 221
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('realm', 'saas', 'Realm', 'Realm of overall application framework', '{restaurant}', '_Realm', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('restaurant', 'saas', 'Restaurant', 'Restaurant realm in saas application', '{dinein,order,menu,inventory,users,tables,invoice,menu,document,order_item,order_items,kds}', '_Realm_Restaurant', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dinein', 'saas', 'Dinein', 'All access to dine in module', '{create,create-sub-order,update,order,table,delete,kds/orders}', '_Realm_Restaurant_Dinein', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order_items', 'saas', 'Order Items', 'All access to order items module', '{update}', '_Realm_Restaurant_Order Items', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order', 'saas', 'Order', 'All access to order module', '{update}', '_Realm_Restaurant_Order', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('order_item', 'saas', 'Order item', 'Single order item accessibility', '{update,delete}', '_Realm_Restaurant_Order item', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('menu', 'saas', 'Menu', 'All access related to menu configuration', '{create,update,read,delete,delete_all,read_category,update_category,delete_category,create_category,stock,stock/create,stock/update,recipe}', '_Realm_Restaurant_Menu', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('inventory', 'saas', 'Inventory', 'All access related to menu configuration', '{create,update,read,delete,read_category,update_category,delete_category,create_category,masters,item-types}', '_Realm_Restaurant_Inventory', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('tables', 'saas', 'Tables', 'Table management accesses', '{create,update,read,delete,table-types,config}', '_Realm_Restaurant_Tables', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('users', 'saas', 'Users', 'User management accesses', '{register,login,add,reset-password,users,roles,roles/config,permissions,permissions/catelog,screens,screens/configure,persons,person-details,realm,realms,delete,delegate-access,client,clients,address}', '_Realm_Restaurant_Users', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('invoice', 'saas', 'Billing', 'Billing generation and update service accessibility', '{create,update,read,delete,read_document,update_document,delete_document,create_document,from-order-service,generate,issue,razorpay,verify}', '_Realm_Restaurant_Billing', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('document', 'saas', 'Document', 'Document storage', '{read,upload,replace,download}', '_Realm_Restaurant_Document', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('kds', 'saas', 'KDS', 'Kitchen Display', '{read,update,delete}', '_Realm_Restaurant_KDS', NULL, NULL, '2025-09-19 02:27:03.632856', '2025-09-19 02:27:03.632856');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_01', 'easyfood', 'Veg', 'Veg only', NULL, '_Dietery_Veg_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_02', 'easyfood', 'Non-Veg', 'Non veg', NULL, '_Dietery_Non-Veg_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_03', 'easyfood', 'Vegan', 'Jain food', NULL, '_Dietery_Vegan_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('addons', 'easyfood', 'Add-ons', 'Add ons', NULL, '_Dietery_Add-ons_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery_04', 'easyfood', 'Eggeterian', 'Egg food', NULL, '_Dietery_Eggeterian_Non_AC', '1000', '1000', '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('roles', 'easyfood', 'Roles', 'Roles definition', '{admin,waiter,receptionist}', '_Roles', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('admin', 'easyfood', 'Admin', 'admin', NULL, '_Roles_Admin', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('waiter', 'easyfood', 'Waiter', 'admin', NULL, '_Roles_Waiter', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('receptionist', 'easyfood', 'Receptionist', 'admin', NULL, '_Roles_Receptionist', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('status', 'easyfood', 'Status', 'Status Selection', '{Vacant,Occupied,Reserved}', '_Status', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('inventory', 'easyfood', 'Inventory', 'Inventory items', '{menu,ration_inventory}', '_Inventory', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('menu', 'easyfood', 'Menu', 'menu items', NULL, '_Inventory_Menu', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('ration_inventory', 'easyfood', 'Ration/Stock', 'stock items', NULL, '_Inventory_Ration/stock', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('units', 'easyfood', 'Units', 'Units Selection', '{kg,g,litre,ml,pcs}', '_Units', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('kg', 'easyfood', 'Kg', 'Kg Selection', '{}', '_Kg', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('g', 'easyfood', 'Gram', 'gram Selection', '{}', '_G', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('litre', 'easyfood', 'Litre', 'Litre Selection', '{}', '_Litre', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('ml', 'easyfood', 'ML', 'Mililitre Selection', '{}', '_Ml', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('pcs', 'easyfood', 'Pieces', 'Pieces Selection', '{}', '_Pieces', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('counter', 'easyfood', 'Counters', 'Kitchen Counters', '{}', '_Counter', '1000', '1000', '2025-08-19 12:47:01.377214', '2025-08-19 12:47:01.377214');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietary_type', 'easyfood', 'Dietary Type', 'Dietary Classification', '{veg,nonveg,egg,chinese}', '_DietaryType', '1000', '1000', '2026-04-22 15:25:53.184091', '2026-04-22 15:25:53.184091');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('zone', 'easyfood', 'Zones', 'Zone Selection', '{Ground,First,Second,third,"roof top"}', '_Zones', '1000', '1000', '2025-08-19 12:47:01.377214', '2026-04-22 15:53:41.247779');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('roof top', 'easyfood', 'Roof top', 'roof top', NULL, '_roof top_', NULL, NULL, '2026-04-22 15:53:41.247779', '2026-04-22 15:53:41.247779');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('section', 'easyfood', 'Section', 'Section Selection', '{AC,Non-AC,general}', '_Section', '1000', '1000', '2025-08-19 12:47:01.377214', '2026-04-22 15:53:47.927039');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('general', 'easyfood', 'General', 'general', NULL, '_general_', NULL, NULL, '2026-04-22 15:53:47.927039', '2026-04-22 15:53:47.927039');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('dietery', 'easyfood', 'Dietery', 'Dietry type', '{dietery_01,dietery_02,dietery_03,addons,dietery_04,biriyani_all_categories}', '_Dietery', '1000', '1000', '2025-09-25 01:36:00.080849', '2026-04-22 15:54:35.44673');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('biriyani_all_categories', 'easyfood', 'Biriyani', '', '{veg_biriyani_biriyani,non_veg_biriyani_biriyani}', '_All_Categories_Biriyani', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 15:54:35.330874', '2026-04-22 15:58:23.350569');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('available_timings', 'easyfood', 'Availability Time', 'Food Availability Timings', '{evening(15:30-17:30)}', '_AvailabilityTime', '1000', '1000', '2026-04-22 15:25:53.184091', '2026-04-22 15:57:26.284375');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('evening(15:30-17:30)', 'easyfood', 'Evening(15:30-17:30)', 'evening(15:30-17:30)', NULL, '_evening(15:30-17:30)_', NULL, NULL, '2026-04-22 15:57:26.284375', '2026-04-22 15:57:26.284375');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('non_veg_biriyani_biriyani', 'easyfood', 'Non Veg Biriyani', '', '{}', '_Dietery_Biriyani_Non_Veg_Biriyani', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 15:58:23.203306', '2026-04-22 15:58:23.2879');
INSERT INTO public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) VALUES ('veg_biriyani_biriyani', 'easyfood', 'Veg Biriyani', '', '{}', '_All_Categories_Biriyani_Veg_Biriyani', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 15:58:12.640177', '2026-04-22 15:58:23.391797');


--
-- TOC entry 4933 (class 0 OID 21071)
-- Dependencies: 217
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.client (id, name, realm, email, phone, logo, saved_address_ids, created_date_time, updated_date_time) VALUES ('easyfood', 'Easy Food Restaurant', 'restaurant', 'easyfood@gmail.com', NULL, NULL, NULL, '2025-09-25 01:36:00.080849', '2025-09-25 01:36:00.080849');


--
-- TOC entry 4938 (class 0 OID 21119)
-- Dependencies: 222
-- Data for Name: dinein_order; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4940 (class 0 OID 21134)
-- Dependencies: 224
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4941 (class 0 OID 21143)
-- Dependencies: 225
-- Data for Name: document_version; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4942 (class 0 OID 21150)
-- Dependencies: 226
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1004, 'easyfood', 'menu', NULL, '771', 'Pork Biriyani', NULL, 'non_veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 300, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Non_Veg_Biriyani_Pork_Biriyani', 0, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.443962', '2026-04-22 16:57:58.443962', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1004, 'easyfood', 'menu', NULL, '771', 'Pork Biriyani', NULL, 'non_veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 340, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Non_Veg_Biriyani_Pork_Biriyani', 1, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.483524', '2026-04-22 16:57:58.483524', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1004, 'easyfood', 'menu', NULL, '771', 'Pork Biriyani', NULL, 'non_veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 380, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Non_Veg_Biriyani_Pork_Biriyani', 2, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.529639', '2026-04-22 16:57:58.529639', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1001, 'easyfood', 'menu', NULL, '666', 'Paneera  Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 210, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Paneer_Biriyani', 2, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:50:18.120753', '2026-04-22 16:50:30.734021', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1002, 'easyfood', 'menu', NULL, '667', 'Gobi Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 140, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Gobi_Biriyani', 0, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:57.988472', '2026-04-22 16:57:57.988472', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1002, 'easyfood', 'menu', NULL, '667', 'Gobi Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 145, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Gobi_Biriyani', 1, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.053047', '2026-04-22 16:57:58.053047', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1002, 'easyfood', 'menu', NULL, '667', 'Gobi Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 155, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Gobi_Biriyani', 2, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.234163', '2026-04-22 16:57:58.234163', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1001, 'easyfood', 'menu', NULL, '666', 'Paneera  Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 160, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Paneer_Biriyani', 1, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:50:18.120753', '2026-04-22 16:50:30.734021', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1003, 'easyfood', 'menu', NULL, '668', 'Mushroom Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 207, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Mushroom_Biriyani', 0, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.310226', '2026-04-22 17:47:14.489577', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1003, 'easyfood', 'menu', NULL, '668', 'Mushroom Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 220, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Mushroom_Biriyani', 1, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.310226', '2026-04-22 16:57:58.310226', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1003, 'easyfood', 'menu', NULL, '668', 'Mushroom Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 240, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Mushroom_Biriyani', 2, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.310226', '2026-04-22 16:57:58.310226', 'null', 250, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1005, 'easyfood', 'menu', NULL, '1005', 'Sev Puri', NULL, 'dietery_01', 'restaurant', 100.000000, 'pcs', NULL, 30, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Veg_Sev_Puri', 0, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.565843', '2026-04-22 17:03:06.429442', 'null', 200, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1005, 'easyfood', 'menu', NULL, '1005', 'Sev Puri', NULL, 'dietery_01', 'restaurant', 100.000000, 'pcs', NULL, 50, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Veg_Sev_Puri', 1, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.602482', '2026-04-22 17:03:06.477747', 'null', 200, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1005, 'easyfood', 'menu', NULL, '1005', 'Sev Puri', NULL, 'dietery_01', 'restaurant', 100.000000, 'pcs', NULL, 90, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Veg_Sev_Puri', 2, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.636421', '2026-04-22 17:03:06.540562', 'null', 200, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1006, 'easyfood', 'menu', NULL, '1006', 'Dahi Puri', NULL, 'dietery_01', 'restaurant', 100.000000, 'pcs', NULL, 65, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Veg_Dahi_Puri', 0, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.671452', '2026-04-22 17:03:06.585882', 'null', 100, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1006, 'easyfood', 'menu', NULL, '1006', 'Dahi Puri', NULL, 'dietery_01', 'restaurant', 100.000000, 'pcs', NULL, 90, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Veg_Dahi_Puri', 1, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.708072', '2026-04-22 17:03:06.626069', 'null', 100, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1006, 'easyfood', 'menu', NULL, '1006', 'Dahi Puri', NULL, 'dietery_01', 'restaurant', 100.000000, 'pcs', NULL, 100, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Veg_Dahi_Puri', 2, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:57:58.742424', '2026-04-22 17:03:06.662534', 'null', 100, 'g');
INSERT INTO public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) VALUES (1001, 'easyfood', 'menu', NULL, '666', 'Paneera  Biriyani', NULL, 'veg_biriyani_biriyani', 'restaurant', 25.000000, 'kg', NULL, 180, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'Dietery_Biriyani_Veg_Biriyani_Paneer_Biriyani', 0, '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', '2026-04-22 16:50:18.120753', '2026-04-22 17:47:14.346639', 'null', 250, 'g');


--
-- TOC entry 4958 (class 0 OID 21267)
-- Dependencies: 242
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4952 (class 0 OID 21242)
-- Dependencies: 236
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4943 (class 0 OID 21165)
-- Dependencies: 227
-- Data for Name: order_item; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4945 (class 0 OID 21178)
-- Dependencies: 229
-- Data for Name: page_definition; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1001, 'easyfood', 'dinein', 'Admin', 'default_dinein', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1003, 'easyfood', 'order', 'Admin', 'default_order', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1005, 'easyfood', 'tables', 'Admin', 'default_tables', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1002, 'easyfood', 'inventory', 'Admin', 'default_inventory', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1004, 'easyfood', 'users', 'Admin', 'default_user', 'exclude', '{test}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1006, 'easyfood', 'invoice', 'Admin', 'default_invoice', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1007, 'easyfood', 'menu', 'Admin', 'default_menu', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1008, 'easyfood', 'document', 'Admin', 'default_document', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1012, 'easyfood', 'documents', 'Admin', 'default_documents', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1009, 'easyfood', 'order_item', 'Admin', 'default_order_items', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1010, 'easyfood', 'order_items', 'Admin', 'default_order_items', 'include', '{ALL}');
INSERT INTO public.page_definition (id, client_id, module, role, screen_id, load_type, operations) OVERRIDING SYSTEM VALUE VALUES (1011, 'easyfood', 'menu', 'Admin2', 'default_menu', 'include', '{ALL}');


--
-- TOC entry 4947 (class 0 OID 21191)
-- Dependencies: 231
-- Data for Name: person; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 4935 (class 0 OID 21093)
-- Dependencies: 219
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1, 'easyfood', 'A01', 'easyfood-a01', '', '', 'vacant', 'general', 'roof top', '2', NULL, true, NULL, NULL, '2026-04-22 15:54:10.247721', '2026-04-22 15:54:10.247721');
INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (2, 'easyfood', 'A02', 'easyfood-a02', '', '', 'vacant', 'general', 'roof top', '2', NULL, true, NULL, NULL, '2026-04-22 15:54:10.284695', '2026-04-22 15:54:10.284695');
INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (3, 'easyfood', 'A03', 'easyfood-a03', '', '', 'vacant', 'general', 'roof top', '2', NULL, true, NULL, NULL, '2026-04-22 15:54:10.31417', '2026-04-22 15:54:10.31417');
INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (4, 'easyfood', 'A04', 'easyfood-a04', '', '', 'vacant', 'general', 'roof top', '2', NULL, true, NULL, NULL, '2026-04-22 15:54:10.33436', '2026-04-22 15:54:10.33436');
INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (5, 'easyfood', 'B01', 'easyfood-b01', '', '', 'vacant', 'AC', 'third', '8', NULL, true, NULL, NULL, '2026-04-22 16:00:21.112354', '2026-04-22 16:00:21.112354');
INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (6, 'easyfood', 'B02', 'easyfood-b02', '', '', 'vacant', 'AC', 'third', '8', NULL, true, NULL, NULL, '2026-04-22 16:00:21.139157', '2026-04-22 16:00:21.139157');
INSERT INTO public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (7, 'easyfood', 'B03', 'easyfood-b03', '', '', 'vacant', 'AC', 'third', '8', NULL, true, NULL, NULL, '2026-04-22 16:00:21.166739', '2026-04-22 16:00:21.166739');


--
-- TOC entry 4934 (class 0 OID 21080)
-- Dependencies: 218
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."user" (username, hashed_password, id, client_id, roles, grants) VALUES ('admin', '$2b$12$NcusUR2dTlmL/bwUYamZt.QOrGW9.ksrmFSQyx32Lc15VtWfyDPFC', '461e8cc6-a897-59b3-9f0e-1f2e19cd179c', 'easyfood', '{Admin}', '{restaurant}');


--
-- TOC entry 4955 (class 0 OID 21260)
-- Dependencies: 239
-- Data for Name: zone_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.zone_config (id, section, zone, client_id, realm) VALUES (1, 'general', 'roof top', 'easyfood', 'restaurant');
INSERT INTO public.zone_config (id, section, zone, client_id, realm) VALUES (2, 'AC', 'third', 'easyfood', 'restaurant');


--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 238
-- Name: address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.address_id_seq', 1000, false);


--
-- TOC entry 4970 (class 0 OID 0)
-- Dependencies: 234
-- Name: billing_document_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_document_items_id_seq', 1, false);


--
-- TOC entry 4971 (class 0 OID 0)
-- Dependencies: 232
-- Name: billing_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_documents_id_seq', 1, false);


--
-- TOC entry 4972 (class 0 OID 0)
-- Dependencies: 223
-- Name: dineinorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dineinorder_id_seq', 1000, false);


--
-- TOC entry 4973 (class 0 OID 0)
-- Dependencies: 243
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 1006, true);


--
-- TOC entry 4974 (class 0 OID 0)
-- Dependencies: 241
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 1, false);


--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 228
-- Name: orderitem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orderitem_id_seq', 1000, false);


--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 230
-- Name: pagedefinition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagedefinition_id_seq', 1000, false);


--
-- TOC entry 4977 (class 0 OID 0)
-- Dependencies: 220
-- Name: tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tables_id_seq', 7, true);


--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 240
-- Name: zone_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zone_config_id_seq', 2, true);


--
-- TOC entry 4777 (class 2606 OID 21236)
-- Name: billing_document_items billing_document_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_document_items
    ADD CONSTRAINT billing_document_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4775 (class 2606 OID 21215)
-- Name: billing_documents billing_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_documents
    ADD CONSTRAINT billing_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4763 (class 2606 OID 21118)
-- Name: category category_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pk PRIMARY KEY (client_id, id);


--
-- TOC entry 4757 (class 2606 OID 21079)
-- Name: client client_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pk PRIMARY KEY (id);


--
-- TOC entry 4765 (class 2606 OID 21128)
-- Name: dinein_order dinein_order_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dinein_order
    ADD CONSTRAINT dinein_order_pk PRIMARY KEY (client_id, id);


--
-- TOC entry 4767 (class 2606 OID 21142)
-- Name: document document_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_pk PRIMARY KEY (id, client_id, category_id);


--
-- TOC entry 4781 (class 2606 OID 21275)
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4779 (class 2606 OID 21251)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4769 (class 2606 OID 21177)
-- Name: order_item order_item_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_pk PRIMARY KEY (id);


--
-- TOC entry 4771 (class 2606 OID 21185)
-- Name: page_definition page_definition_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_definition
    ADD CONSTRAINT page_definition_pk PRIMARY KEY (client_id, module, role);


--
-- TOC entry 4773 (class 2606 OID 21200)
-- Name: person person_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_pkey PRIMARY KEY (id);


--
-- TOC entry 4761 (class 2606 OID 21103)
-- Name: tables tables_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pk PRIMARY KEY (id, client_id);


--
-- TOC entry 4759 (class 2606 OID 21087)
-- Name: user user_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pk PRIMARY KEY (id, client_id);


--
-- TOC entry 4787 (class 2606 OID 21237)
-- Name: billing_document_items billing_document_items_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_document_items
    ADD CONSTRAINT billing_document_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.billing_documents(id) ON DELETE CASCADE;


--
-- TOC entry 4784 (class 2606 OID 21129)
-- Name: dinein_order dinein_order_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dinein_order
    ADD CONSTRAINT dinein_order_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4785 (class 2606 OID 21171)
-- Name: order_item order_item_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4786 (class 2606 OID 21186)
-- Name: page_definition page_definition_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_definition
    ADD CONSTRAINT page_definition_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4783 (class 2606 OID 21105)
-- Name: tables tables_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4782 (class 2606 OID 21088)
-- Name: user user_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


-- Completed on 2026-04-23 12:45:14

--
-- PostgreSQL database dump complete
--

