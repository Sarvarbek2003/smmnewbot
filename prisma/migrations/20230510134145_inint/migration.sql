-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT,
    "is_block" BOOLEAN NOT NULL DEFAULT false,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partners" INTEGER NOT NULL DEFAULT 0,
    "card_num" TEXT,
    "cardDate" TEXT,
    "verify" INTEGER,
    "summa" INTEGER,
    "group_partners" INTEGER NOT NULL DEFAULT 0,
    "created_ad" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting" (
    "id" SERIAL NOT NULL,
    "chanell_id" TEXT,
    "chanell_username" TEXT,
    "kurs" DOUBLE PRECISION,
    "partner_price" INTEGER,
    "admin" TEXT,
    "group_partner_sum" TEXT,
    "balance" DOUBLE PRECISION,
    "bot_is_on" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "info" JSONB,
    "status" TEXT NOT NULL DEFAULT 'working',

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "info" JSONB,
    "status" TEXT NOT NULL DEFAULT 'working',

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'working',
    "parter_id" INTEGER NOT NULL,
    "refill" BOOLEAN NOT NULL DEFAULT false,
    "cancel" BOOLEAN NOT NULL DEFAULT false,
    "feild" JSONB,
    "info" JSONB,
    "type" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER,
    "chat_id" BIGINT,
    "link" TEXT,
    "price" DOUBLE PRECISION,
    "start_count" INTEGER,
    "status" TEXT,
    "count" INTEGER,
    "ready_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL,
    "service_name" TEXT,
    "service_id" INTEGER NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_chat_id_key" ON "users"("chat_id");
