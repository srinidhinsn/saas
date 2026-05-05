--
-- PostgreSQL database dump
--

\restrict eywIKlX9iOn64aG9JaCJPlncHqDcFmSrKTbAfPVezdTD5K0CZmVFbeNW3hn6wmT

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

-- Started on 2026-05-05 10:40:19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- TOC entry 235 (class 1259 OID 230208)
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
-- TOC entry 236 (class 1259 OID 230215)
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
-- TOC entry 233 (class 1259 OID 230179)
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
-- TOC entry 232 (class 1259 OID 230178)
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
-- TOC entry 4957 (class 0 OID 0)
-- Dependencies: 232
-- Name: billing_document_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_document_items_id_seq OWNED BY public.billing_document_items.id;


--
-- TOC entry 231 (class 1259 OID 230158)
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
-- TOC entry 230 (class 1259 OID 230157)
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
-- TOC entry 4958 (class 0 OID 0)
-- Dependencies: 230
-- Name: billing_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_documents_id_seq OWNED BY public.billing_documents.id;


--
-- TOC entry 219 (class 1259 OID 230065)
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
-- TOC entry 215 (class 1259 OID 230026)
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
-- TOC entry 220 (class 1259 OID 230074)
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
-- TOC entry 221 (class 1259 OID 230081)
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
-- TOC entry 223 (class 1259 OID 230099)
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
-- TOC entry 222 (class 1259 OID 230089)
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    category_id text NOT NULL,
    name text,
    description text,
    realm text,
    filetype text,
    extension text,
    size_kb text,
    is_protected boolean,
    is_active boolean,
    uuid_name text,
    path text,
    storage_type text,
    checksum_md5 text,
    created_by text,
    last_read_by text,
    created_date_time timestamp without time zone DEFAULT now(),
    last_read_date_time timestamp without time zone DEFAULT now(),
    deleted boolean,
    deleted_at timestamp without time zone
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 230106)
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
-- TOC entry 241 (class 1259 OID 230232)
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
-- TOC entry 240 (class 1259 OID 230223)
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
-- TOC entry 239 (class 1259 OID 230222)
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
-- TOC entry 4959 (class 0 OID 0)
-- Dependencies: 239
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- TOC entry 234 (class 1259 OID 230198)
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
-- TOC entry 225 (class 1259 OID 230121)
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
    parent_item_key text,
    unit_price double precision,
    line_total double precision
);


ALTER TABLE public.order_item OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 230126)
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
-- TOC entry 227 (class 1259 OID 230134)
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
-- TOC entry 228 (class 1259 OID 230139)
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
-- TOC entry 229 (class 1259 OID 230147)
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
-- TOC entry 217 (class 1259 OID 230048)
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
-- TOC entry 218 (class 1259 OID 230059)
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
-- TOC entry 216 (class 1259 OID 230035)
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
-- TOC entry 237 (class 1259 OID 230216)
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
-- TOC entry 238 (class 1259 OID 230221)
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
-- TOC entry 4736 (class 2604 OID 230182)
-- Name: billing_document_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_document_items ALTER COLUMN id SET DEFAULT nextval('public.billing_document_items_id_seq'::regclass);


--
-- TOC entry 4729 (class 2604 OID 230161)
-- Name: billing_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_documents ALTER COLUMN id SET DEFAULT nextval('public.billing_documents_id_seq'::regclass);


--
-- TOC entry 4748 (class 2604 OID 230226)
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- TOC entry 4945 (class 0 OID 230208)
-- Dependencies: 235
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address (id, address_line1, address_line2, city, name, country, state, pincode, contact_name, contact_number, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4943 (class 0 OID 230179)
-- Dependencies: 233
-- Data for Name: billing_document_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_document_items (id, document_id, item_ref_id, description, quantity, unit_price, discount, tax_rate, total, is_active, created_at, updated_at, unit_of_measure, item_category, item_discount, item_tax_code) FROM stdin;
\.


--
-- TOC entry 4941 (class 0 OID 230158)
-- Dependencies: 231
-- Data for Name: billing_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_documents (id, client_id, document_type, document_number, document_date, due_date, reference_number, order_id, customer_id, vendor_id, currency, status, contact_email, contact_phone, terms, notes, subtotal, tax_amount, discount_amount, total_amount, linked_document_ids, is_active, created_by, updated_by, created_at, updated_at, payment_status, payment_due_date, payment_method, payment_reference, approval_status, approved_by, approval_date, gl_account_code, tax_code, accounting_period, currency_conversion_rate, shipping_address, shipping_method, delivery_date, tracking_number, document_version, invoice_date, note, customer_terms) FROM stdin;
\.


--
-- TOC entry 4929 (class 0 OID 230065)
-- Dependencies: 219
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category (id, client_id, name, description, sub_categories, slug, created_by, updated_by, created_at, updated_at) FROM stdin;
realm	saas	Realm	Realm of overall application framework	{restaurant}	_Realm	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
restaurant	saas	Restaurant	Restaurant realm in saas application	{dinein,order,menu,inventory,users,tables,invoice,menu,documents,order_item,order_items,kds,document}	_Realm_Restaurant	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
dinein	saas	Dinein	All access to dine in module	{create,create-sub-order,update,order,table,delete,kds/orders,cancel}	_Realm_Restaurant_Dinein	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
order_items	saas	Order Items	All access to order items module	{update}	_Realm_Restaurant_Order Items	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
order	saas	Order	All access to order module	{update}	_Realm_Restaurant_Order	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
order_item	saas	Order item	Single order item accessibility	{update,delete}	_Realm_Restaurant_Order item	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
menu	saas	Menu	All access related to menu configuration	{create,update,read,delete,delete_all,read_category,update_category,delete_category,create_category,stock,stock/create,stock/update,recipe}	_Realm_Restaurant_Menu	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
inventory	saas	Inventory	All access related to menu configuration	{create,update,read,delete,read_category,update_category,delete_category,create_category,masters,item-types}	_Realm_Restaurant_Inventory	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
tables	saas	Tables	Table management accesses	{create,update,read,delete,table-types,config}	_Realm_Restaurant_Tables	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
users	saas	Users	User management accesses	{register,login,add,reset-password,users,roles,roles/config,permissions,permissions/catelog,screens,screens/configure,persons,person-details,realm,realms,delete,delegate-access,client,clients,address}	_Realm_Restaurant_Users	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
invoice	saas	Billing	Billing generation and update service accessibility	{create,update,read,delete,read_document,update_document,delete_document,create_document,from-order-service,generate,issue,razorpay,verify}	_Realm_Restaurant_Billing	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
documents	saas	Documents	Document storage	{read,upload,replace,download}	_Realm_Restaurant_Document	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
document	saas	Document	Document storage	{read,upload,replace,download}	_Realm_Restaurant_Document	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
kds	saas	KDS	Kitchen Display	{read,update,delete}	_Realm_Restaurant_KDS	\N	\N	2025-09-19 02:27:03.632856	2025-09-19 02:27:03.632856
dietery_02	easyfood	Lunch	Lunch	\N	_Dietery_Lunch	1000	1000	2025-09-25 01:36:00.080849	2025-09-25 01:36:00.080849
dietery_03	easyfood	Vegan	Jain food	\N	_Dietery_Vegan	1000	1000	2025-09-25 01:36:00.080849	2025-09-25 01:36:00.080849
combos	easyfood	Combos	Combos	\N	_Dietery_Combos	1000	1000	2025-09-25 01:36:00.080849	2025-09-25 01:36:00.080849
dietery_04	easyfood	Eggeterian	Egg food	\N	_Dietery_Eggeterian_Non_AC	1000	1000	2025-09-25 01:36:00.080849	2025-09-25 01:36:00.080849
roles	easyfood	Roles	Roles definition	{admin,waiter,receptionist}	_Roles	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
admin	easyfood	Admin	admin	\N	_Roles_Admin	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
waiter	easyfood	Waiter	admin	\N	_Roles_Waiter	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
receptionist	easyfood	Receptionist	admin	\N	_Roles_Receptionist	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
zone	easyfood	Zones	Zone Selection	{Ground,First,Second,third}	_Zones	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
section	easyfood	Section	Section Selection	{AC,Non-AC}	_Section	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
status	easyfood	Status	Status Selection	{Vacant,Occupied,Reserved}	_Status	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
inventory	easyfood	Inventory	Inventory items	{menu,ration_inventory}	_Inventory	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
menu	easyfood	Menu	menu items	\N	_Inventory_Menu	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
ration_inventory	easyfood	Ration/Stock	stock items	\N	_Inventory_Ration/stock	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
units	easyfood	Units	Units Selection	{kg,g,litre,ml,pcs}	_Units	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
kg	easyfood	Kg	Kg Selection	{}	_Kg	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
g	easyfood	Gram	gram Selection	{}	_G	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
litre	easyfood	Litre	Litre Selection	{}	_Litre	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
ml	easyfood	ML	Mililitre Selection	{}	_Ml	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
pcs	easyfood	Pieces	Pieces Selection	{}	_Pieces	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
counter	easyfood	Counters	Kitchen Counters	{}	_Counter	1000	1000	2025-08-19 12:47:01.377214	2025-08-19 12:47:01.377214
dietary_type	easyfood	Dietary Type	Dietary Classification	{veg,nonveg,egg,chinese}	_DietaryType	1000	1000	2026-05-05 10:32:39.154882	2026-05-05 10:32:39.154882
available_timings	easyfood	Availability Time	Food Availability Timings	{}	_AvailabilityTime	1000	1000	2026-05-05 10:32:39.154882	2026-05-05 10:32:39.154882
veg_items_breakfast	easyfood	Veg Items		{}	_Dietery_Breakfast_Veg_Items	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:34:46.198735	2026-05-05 10:34:46.277866
dietery_01	easyfood	Breakfast		{veg_items_breakfast}	_All_Categories_Breakfast	1000	1000	2025-09-25 01:36:00.080849	2026-05-05 10:34:46.345998
burger_addons_addons	easyfood	Burger Addons		{}	_Dietery_Addons_Burger_Addons	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:54.715278	2026-05-05 10:36:54.783783
addons	easyfood	Add-ons		{burger_addons_addons}	_All_Categories_Addons	1000	1000	2025-09-25 01:36:00.080849	2026-05-05 10:36:54.849017
dietery	easyfood	Dietery	Dietry type	{dietery_01,dietery_02,dietery_03,addons,combos,dietery_04,burgers_all_categories}	_Dietery	1000	1000	2025-09-25 01:36:00.080849	2026-05-05 10:37:05.882069
burgers_all_categories	easyfood	Burgers		{}	_Dietery_Burgers	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:37:05.835385	2026-05-05 10:37:05.927963
\.


--
-- TOC entry 4925 (class 0 OID 230026)
-- Dependencies: 215
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client (id, name, realm, email, phone, logo, saved_address_ids, created_date_time, updated_date_time) FROM stdin;
easyfood	Easy Food Restaurant	restaurant	easyfood@gmail.com	\N	\N	\N	2025-09-25 01:36:00.080849	2025-09-25 01:36:00.080849
\.


--
-- TOC entry 4930 (class 0 OID 230074)
-- Dependencies: 220
-- Data for Name: dinein_order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dinein_order (id, client_id, dinein_order_id, table_id, invoice_id, handler_id, invoice_status, price, cst, gst, discount, total_price, created_by, updated_by, created_at, updated_at, status) FROM stdin;
\.


--
-- TOC entry 4933 (class 0 OID 230099)
-- Dependencies: 223
-- Data for Name: document_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_version (id, version_no, url, path, status, category_id, created_by, last_read_by, created_date_time, last_read_date_time) FROM stdin;
\.


--
-- TOC entry 4932 (class 0 OID 230089)
-- Dependencies: 222
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, client_id, category_id, name, description, realm, filetype, extension, size_kb, is_protected, is_active, uuid_name, path, storage_type, checksum_md5, created_by, last_read_by, created_date_time, last_read_date_time, deleted, deleted_at) FROM stdin;
2aad2457-b893-4136-959b-e81b3f32dabc	easyfood	menu_images	Dosa.jpg	Menu item image	menu	image/jpeg	.jpg	8	f	t	c8700644-6b4a-454e-abbb-63b714e427db	uploads\\2026\\May\\05\\c8700644-6b4a-454e-abbb-63b714e427db	local	1c80b248a4bd5d27fb19308b119d742d	system	\N	2026-05-05 10:35:07.556011	2026-05-05 10:35:07.556011	f	\N
94fd50ca-f69d-4870-86b7-64109e772834	easyfood	menu_images	idly.jpg	Menu item image	menu	image/jpeg	.jpg	4	f	t	f36295c4-7012-4aa0-9f2d-28e587de1b04	uploads\\2026\\May\\05\\f36295c4-7012-4aa0-9f2d-28e587de1b04	local	b5fac56c66502e51a55fd11f81086db4	system	\N	2026-05-05 10:35:46.34891	2026-05-05 10:35:46.34891	f	\N
290e198e-2c9d-42f8-847e-97c5f63fba7f	easyfood	menu_images	vada.jpg	Menu item image	menu	image/jpeg	.jpg	9	f	t	cf5971a8-b804-4581-8c4e-da412bfbfa1f	uploads\\2026\\May\\05\\cf5971a8-b804-4581-8c4e-da412bfbfa1f	local	c6471e64de54f5c8a67990541b8a6d99	system	\N	2026-05-05 10:36:05.476943	2026-05-05 10:36:05.476943	f	\N
\.


--
-- TOC entry 4934 (class 0 OID 230106)
-- Dependencies: 224
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (id, client_id, inventory_id, line_item_id, code, name, description, category_id, realm, availability, unit, image_id, unit_price, unit_cst, unit_gst, unit_total_price, price, cst, gst, discount, total_price, slug, zone_config_id, created_by, updated_by, created_at, updated_at, recipe, serving_quantity, serving_unit) FROM stdin;
1005	easyfood	menu	{1004}	\N	Veg Cheese Burger	Veg Cheese Burger	burgers_all_categories	restaurant	0.000000	\N	\N	110	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Burgers_Veg_Cheese_Burger	2	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:38:04.743617	2026-05-05 10:38:04.743617	null	\N	\N
1000	easyfood	menu	\N	\N	Dosa	Butter Dosa	veg_items_breakfast	restaurant	0.000000	\N	2aad2457-b893-4136-959b-e81b3f32dabc	50	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Dosa	0	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:35:07.92109	2026-05-05 10:35:23.411279	null	\N	\N
1000	easyfood	menu	\N	\N	Dosa	Butter Dosa	veg_items_breakfast	restaurant	0.000000	\N	2aad2457-b893-4136-959b-e81b3f32dabc	70	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Dosa	1	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:35:07.94983	2026-05-05 10:35:23.434432	null	\N	\N
1000	easyfood	menu	\N	\N	Dosa	Butter Dosa	veg_items_breakfast	restaurant	0.000000	\N	2aad2457-b893-4136-959b-e81b3f32dabc	85	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Dosa	2	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:35:07.972845	2026-05-05 10:35:23.455698	null	\N	\N
1001	easyfood	menu	{}	\N	Idly	Idly	veg_items_breakfast	restaurant	0.000000	\N	94fd50ca-f69d-4870-86b7-64109e772834	25	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Idly	0	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:35:46.380014	2026-05-05 10:35:46.380014	null	\N	\N
1001	easyfood	menu	{}	\N	Idly	Idly	veg_items_breakfast	restaurant	0.000000	\N	94fd50ca-f69d-4870-86b7-64109e772834	35	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Idly	1	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:35:46.399329	2026-05-05 10:35:46.399329	null	\N	\N
1001	easyfood	menu	{}	\N	Idly	Idly	veg_items_breakfast	restaurant	0.000000	\N	94fd50ca-f69d-4870-86b7-64109e772834	50	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Idly	2	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:35:46.420461	2026-05-05 10:35:46.420461	null	\N	\N
1002	easyfood	menu	{}	\N	Vada		veg_items_breakfast	restaurant	0.000000	\N	290e198e-2c9d-42f8-847e-97c5f63fba7f	20	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Vada	0	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:05.50744	2026-05-05 10:36:05.50744	null	\N	\N
1002	easyfood	menu	{}	\N	Vada		veg_items_breakfast	restaurant	0.000000	\N	290e198e-2c9d-42f8-847e-97c5f63fba7f	30	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Vada	1	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:05.528431	2026-05-05 10:36:05.528431	null	\N	\N
1002	easyfood	menu	{}	\N	Vada		veg_items_breakfast	restaurant	0.000000	\N	290e198e-2c9d-42f8-847e-97c5f63fba7f	40	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Breakfast_Veg_Items_Vada	2	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:05.549595	2026-05-05 10:36:05.549595	null	\N	\N
1003	easyfood	menu	{1000,1001,1002}	\N	Breakfast Combo	Breakfast Combo	combos	restaurant	0.000000	\N	\N	100	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Combos_Breakfast_Combo	0	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:40.643615	2026-05-05 10:36:40.643615	null	\N	\N
1003	easyfood	menu	{1000,1001,1002}	\N	Breakfast Combo	Breakfast Combo	combos	restaurant	0.000000	\N	\N	120	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Combos_Breakfast_Combo	1	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:40.66538	2026-05-05 10:36:40.66538	null	\N	\N
1003	easyfood	menu	{1000,1001,1002}	\N	Breakfast Combo	Breakfast Combo	combos	restaurant	0.000000	\N	\N	140	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Combos_Breakfast_Combo	2	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:36:40.686327	2026-05-05 10:36:40.686327	null	\N	\N
1004	easyfood	menu	{}	\N	Lettuce		burger_addons_addons	restaurant	0.000000	\N	\N	25	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Add_ons_Burger_Addons_Lettuce	0	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:37:30.987488	2026-05-05 10:37:30.987488	null	\N	\N
1004	easyfood	menu	{}	\N	Lettuce		burger_addons_addons	restaurant	0.000000	\N	\N	35	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Add_ons_Burger_Addons_Lettuce	1	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:37:31.012586	2026-05-05 10:37:31.012586	null	\N	\N
1004	easyfood	menu	{}	\N	Lettuce		burger_addons_addons	restaurant	0.000000	\N	\N	40	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Add_ons_Burger_Addons_Lettuce	2	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:37:31.033911	2026-05-05 10:37:31.033911	null	\N	\N
1005	easyfood	menu	{1004}	\N	Veg Cheese Burger	Veg Cheese Burger	burgers_all_categories	restaurant	0.000000	\N	\N	80	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Burgers_Veg_Cheese_Burger	0	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:38:04.699576	2026-05-05 10:38:04.699576	null	\N	\N
1005	easyfood	menu	{1004}	\N	Veg Cheese Burger	Veg Cheese Burger	burgers_all_categories	restaurant	0.000000	\N	\N	95	\N	\N	\N	\N	\N	\N	0	\N	Dietery_Burgers_Veg_Cheese_Burger	1	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	2026-05-05 10:38:04.723278	2026-05-05 10:38:04.723278	null	\N	\N
\.


--
-- TOC entry 4950 (class 0 OID 230223)
-- Dependencies: 240
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_transactions (id, transaction_id, client_id, stock_item_id, inventory_id, name, transaction_type, movement_type, quantity, unit, before_stock, after_stock, reference_id, reference_type, created_by, created_at, remarks) FROM stdin;
\.


--
-- TOC entry 4944 (class 0 OID 230198)
-- Dependencies: 234
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, client_id, template_name, template_body, type, realm, is_read, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4935 (class 0 OID 230121)
-- Dependencies: 225
-- Data for Name: order_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_item (id, client_id, order_id, item_id, item_name, slug, status, quantity, frontend_unique_key, parent_item_key, unit_price, line_total) FROM stdin;
\.


--
-- TOC entry 4937 (class 0 OID 230134)
-- Dependencies: 227
-- Data for Name: page_definition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.page_definition (id, client_id, module, role, screen_id, load_type, operations) FROM stdin;
1001	easyfood	dinein	Admin	default_dinein	include	{ALL}
1003	easyfood	order	Admin	default_order	include	{ALL}
1005	easyfood	tables	Admin	default_tables	include	{ALL}
1002	easyfood	inventory	Admin	default_inventory	include	{ALL}
1004	easyfood	users	Admin	default_user	include	{ALL}
1006	easyfood	invoice	Admin	default_invoice	include	{ALL}
1007	easyfood	menu	Admin	default_menu	include	{ALL}
1008	easyfood	document	Admin	default_document	include	{ALL}
1012	easyfood	documents	Admin	default_documents	include	{ALL}
1009	easyfood	order_item	Admin	default_order_items	include	{ALL}
1010	easyfood	order_items	Admin	default_order_items	include	{ALL}
1011	easyfood	menu	Admin2	default_menu	include	{ALL}
\.


--
-- TOC entry 4939 (class 0 OID 230147)
-- Dependencies: 229
-- Data for Name: person; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.person (id, first_name, last_name, dob, email, phone, person_type, saved_address_ids, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4927 (class 0 OID 230048)
-- Dependencies: 217
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tables (id, client_id, name, slug, qr_code_url, description, status, section, location_zone, table_type, sort_order, is_active, created_by, updated_by, created_at, updated_at) FROM stdin;
1	easyfood	T01	easyfood-t01			vacant	AC	Ground	3	\N	t	\N	\N	2026-05-05 10:34:14.935308	2026-05-05 10:34:14.935308
2	easyfood	T02	easyfood-t02			vacant	AC	Ground	3	\N	t	\N	\N	2026-05-05 10:34:14.966898	2026-05-05 10:34:14.966898
3	easyfood	T03	easyfood-t03			vacant	AC	Ground	3	\N	t	\N	\N	2026-05-05 10:34:14.99002	2026-05-05 10:34:14.99002
4	easyfood	T04	easyfood-t04			vacant	AC	Ground	3	\N	t	\N	\N	2026-05-05 10:34:15.009207	2026-05-05 10:34:15.009207
5	easyfood	T05	easyfood-t05			vacant	AC	Ground	3	\N	t	\N	\N	2026-05-05 10:34:15.028788	2026-05-05 10:34:15.028788
6	easyfood	B01	easyfood-b01			vacant	Non-AC	Ground	4	\N	t	\N	\N	2026-05-05 10:34:25.681995	2026-05-05 10:34:25.681995
7	easyfood	B02	easyfood-b02			vacant	Non-AC	Ground	4	\N	t	\N	\N	2026-05-05 10:34:25.706541	2026-05-05 10:34:25.706541
8	easyfood	B03	easyfood-b03			vacant	Non-AC	Ground	4	\N	t	\N	\N	2026-05-05 10:34:25.726541	2026-05-05 10:34:25.726541
\.


--
-- TOC entry 4926 (class 0 OID 230035)
-- Dependencies: 216
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (username, hashed_password, id, client_id, roles, grants) FROM stdin;
admin	$2b$12$NcusUR2dTlmL/bwUYamZt.QOrGW9.ksrmFSQyx32Lc15VtWfyDPFC	461e8cc6-a897-59b3-9f0e-1f2e19cd179c	easyfood	{Admin}	{restaurant}
\.


--
-- TOC entry 4947 (class 0 OID 230216)
-- Dependencies: 237
-- Data for Name: zone_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zone_config (id, section, zone, client_id, realm) FROM stdin;
1	Non-AC	Ground	easyfood	restaurant
2	AC	Ground	easyfood	restaurant
\.


--
-- TOC entry 4960 (class 0 OID 0)
-- Dependencies: 236
-- Name: address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.address_id_seq', 1000, false);


--
-- TOC entry 4961 (class 0 OID 0)
-- Dependencies: 232
-- Name: billing_document_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_document_items_id_seq', 1, false);


--
-- TOC entry 4962 (class 0 OID 0)
-- Dependencies: 230
-- Name: billing_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billing_documents_id_seq', 1, false);


--
-- TOC entry 4963 (class 0 OID 0)
-- Dependencies: 221
-- Name: dineinorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dineinorder_id_seq', 1000, false);


--
-- TOC entry 4964 (class 0 OID 0)
-- Dependencies: 241
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 1005, true);


--
-- TOC entry 4965 (class 0 OID 0)
-- Dependencies: 239
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 1, false);


--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 226
-- Name: orderitem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orderitem_id_seq', 1000, false);


--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 228
-- Name: pagedefinition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagedefinition_id_seq', 1000, false);


--
-- TOC entry 4968 (class 0 OID 0)
-- Dependencies: 218
-- Name: tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tables_id_seq', 8, true);


--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 238
-- Name: zone_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zone_config_id_seq', 2, true);


--
-- TOC entry 4771 (class 2606 OID 230192)
-- Name: billing_document_items billing_document_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_document_items
    ADD CONSTRAINT billing_document_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4769 (class 2606 OID 230171)
-- Name: billing_documents billing_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_documents
    ADD CONSTRAINT billing_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4757 (class 2606 OID 230073)
-- Name: category category_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pk PRIMARY KEY (client_id, id);


--
-- TOC entry 4751 (class 2606 OID 230034)
-- Name: client client_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT client_pk PRIMARY KEY (id);


--
-- TOC entry 4759 (class 2606 OID 230083)
-- Name: dinein_order dinein_order_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dinein_order
    ADD CONSTRAINT dinein_order_pk PRIMARY KEY (client_id, id);


--
-- TOC entry 4761 (class 2606 OID 230098)
-- Name: documents document_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT document_pk PRIMARY KEY (id, client_id, category_id);


--
-- TOC entry 4775 (class 2606 OID 230231)
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4773 (class 2606 OID 230207)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4763 (class 2606 OID 230133)
-- Name: order_item order_item_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_pk PRIMARY KEY (id);


--
-- TOC entry 4765 (class 2606 OID 230141)
-- Name: page_definition page_definition_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_definition
    ADD CONSTRAINT page_definition_pk PRIMARY KEY (client_id, module, role);


--
-- TOC entry 4767 (class 2606 OID 230156)
-- Name: person person_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_pkey PRIMARY KEY (id);


--
-- TOC entry 4755 (class 2606 OID 230058)
-- Name: tables tables_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pk PRIMARY KEY (id, client_id);


--
-- TOC entry 4753 (class 2606 OID 230042)
-- Name: user user_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pk PRIMARY KEY (id, client_id);


--
-- TOC entry 4781 (class 2606 OID 230193)
-- Name: billing_document_items billing_document_items_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_document_items
    ADD CONSTRAINT billing_document_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.billing_documents(id) ON DELETE CASCADE;


--
-- TOC entry 4778 (class 2606 OID 230084)
-- Name: dinein_order dinein_order_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dinein_order
    ADD CONSTRAINT dinein_order_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4779 (class 2606 OID 230127)
-- Name: order_item order_item_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item
    ADD CONSTRAINT order_item_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4780 (class 2606 OID 230142)
-- Name: page_definition page_definition_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_definition
    ADD CONSTRAINT page_definition_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4777 (class 2606 OID 230060)
-- Name: tables tables_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


--
-- TOC entry 4776 (class 2606 OID 230043)
-- Name: user user_client_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_client_fk FOREIGN KEY (client_id) REFERENCES public.client(id) ON DELETE CASCADE;


-- Completed on 2026-05-05 10:40:19

--
-- PostgreSQL database dump complete
--

\unrestrict eywIKlX9iOn64aG9JaCJPlncHqDcFmSrKTbAfPVezdTD5K0CZmVFbeNW3hn6wmT

