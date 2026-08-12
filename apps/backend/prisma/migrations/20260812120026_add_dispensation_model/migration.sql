-- CreateTable
CREATE TABLE "Dispensation" (
    "id" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "medicineBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispensedByUserId" TEXT,

    CONSTRAINT "Dispensation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_medicineBatchId_fkey" FOREIGN KEY ("medicineBatchId") REFERENCES "MedicineBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispensation" ADD CONSTRAINT "Dispensation_dispensedByUserId_fkey" FOREIGN KEY ("dispensedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
