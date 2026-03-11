-- CreateIndex
CREATE INDEX "dailycheckapp_school_giga_id_school_idx" ON "dailycheckapp_school"("giga_id_school");

-- CreateIndex
CREATE INDEX "dailycheckapp_school_giga_id_school_device_hardware_id_idx" ON "dailycheckapp_school"("giga_id_school", "device_hardware_id");

