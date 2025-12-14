-- CreateEnum
CREATE TYPE "shipping_size_enum" AS ENUM ('XS', 'S', 'M', 'L');

-- CreateTable
CREATE TABLE "carrito" (
    "id" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT,
    "phone" VARCHAR(20),
    "id_rol" INTEGER NOT NULL,
    "c_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "u_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "google_id" VARCHAR(255),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verification_expires_at" TIMESTAMPTZ(6),
    "reset_token" VARCHAR(255),
    "reset_token_expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunas" (
    "id" SERIAL NOT NULL,
    "codigo_envio" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_region" INTEGER,

    CONSTRAINT "comunas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costos_envio" (
    "id" SERIAL NOT NULL,
    "id_comuna_destino" INTEGER NOT NULL,
    "size" "shipping_size_enum" NOT NULL,
    "costo" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costos_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id_cliente" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "favorited_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_favoritos" PRIMARY KEY ("id_cliente","id_producto")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "id_cliente" INTEGER,
    "recipient_name" VARCHAR(255) NOT NULL,
    "recipient_phone" VARCHAR(50),
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "state_province" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id" SERIAL NOT NULL,
    "id_cliente" INTEGER,
    "total_precio" INTEGER NOT NULL,
    "id_status_ordenes" INTEGER NOT NULL,
    "c_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "u_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_location" INTEGER NOT NULL,
    "costo_envio" INTEGER,
    "id_comuna_destino" INTEGER,
    "blue_express_code" VARCHAR(255),
    "access_token" TEXT,
    "short_access_token" VARCHAR(8),
    "comments" TEXT,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_items" (
    "id" SERIAL NOT NULL,
    "id_orden" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario_congelado" DECIMAL(10,2) NOT NULL,
    "discount_aplicado_congelado" DECIMAL(10,8) NOT NULL,
    "precio_item_total" DECIMAL(10,2),

    CONSTRAINT "ordenes_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_statuses" (
    "id" SERIAL NOT NULL,
    "status_code" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "payment_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "id_orden" INTEGER NOT NULL,
    "id_payment_status" INTEGER NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_id_prod" VARCHAR(255),
    "transaction_id_inte" VARCHAR(255),
    "provider" VARCHAR(100),
    "payment_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "precio" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_categoria" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "discount" DECIMAL(10,8) NOT NULL DEFAULT 0.00,
    "precio_final" INTEGER NOT NULL,
    "shipping_size" "shipping_size_enum",
    "image_url" TEXT,
    "image_public_id" TEXT,
    "rating" INTEGER,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regiones" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" SERIAL NOT NULL,
    "rol" VARCHAR(100) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_ordenes" (
    "id" SERIAL NOT NULL,
    "status" VARCHAR(100) NOT NULL,

    CONSTRAINT "status_ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_google_id_key" ON "clientes"("google_id");

-- CreateIndex
CREATE INDEX "idx_clientes_verification_token" ON "clientes"("verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "comunas_codigo_envio_key" ON "comunas"("codigo_envio");

-- CreateIndex
CREATE INDEX "idx_comunas_codigo_envio" ON "comunas"("codigo_envio");

-- CreateIndex
CREATE INDEX "idx_costos_envio_comuna_size" ON "costos_envio"("id_comuna_destino", "size");

-- CreateIndex
CREATE UNIQUE INDEX "unique_comuna_destino_size" ON "costos_envio"("id_comuna_destino", "size");

-- CreateIndex
CREATE INDEX "idx_location_id_cliente" ON "locations"("id_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "unique_ordenes_access_token" ON "ordenes"("access_token");

-- CreateIndex
CREATE INDEX "idx_ordenes_access_token" ON "ordenes"("access_token");

-- CreateIndex
CREATE INDEX "idx_ordenes_id_comuna_destino" ON "ordenes"("id_comuna_destino");

-- CreateIndex
CREATE UNIQUE INDEX "payment_statuses_status_code_key" ON "payment_statuses"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_prod_key" ON "payments"("transaction_id_prod");

-- CreateIndex
CREATE INDEX "idx_payment_id_orden" ON "payments"("id_orden");

-- CreateIndex
CREATE INDEX "idx_payment_transaction_id_prod" ON "payments"("transaction_id_prod");

-- CreateIndex
CREATE INDEX "idx_payment_transaction_id_inte" ON "payments"("transaction_id_inte");

-- CreateIndex
CREATE INDEX "idx_productos_is_active" ON "productos"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "regiones_nombre_key" ON "regiones"("nombre");

-- CreateIndex
CREATE INDEX "idx_regiones_nombre" ON "regiones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rol_rol_key" ON "rol"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "status_ordenes_status_key" ON "status_ordenes"("status");

-- AddForeignKey
ALTER TABLE "carrito" ADD CONSTRAINT "fk_carrito_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carrito" ADD CONSTRAINT "fk_carrito_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "fk_clientes_rol" FOREIGN KEY ("id_rol") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "costos_envio" ADD CONSTRAINT "fk_comuna_destino" FOREIGN KEY ("id_comuna_destino") REFERENCES "comunas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "fk_favoritos_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "fk_favoritos_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "fk_location_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "fk_ordenes_cliente" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "fk_ordenes_comuna_destino" FOREIGN KEY ("id_comuna_destino") REFERENCES "comunas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "fk_ordenes_location" FOREIGN KEY ("id_location") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "fk_ordenes_status_ordenes" FOREIGN KEY ("id_status_ordenes") REFERENCES "status_ordenes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes_items" ADD CONSTRAINT "fk_ordenes_items_orden" FOREIGN KEY ("id_orden") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ordenes_items" ADD CONSTRAINT "fk_ordenes_items_producto" FOREIGN KEY ("id_producto") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payment_order" FOREIGN KEY ("id_orden") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payment_status" FOREIGN KEY ("id_payment_status") REFERENCES "payment_statuses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "fk_id_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
