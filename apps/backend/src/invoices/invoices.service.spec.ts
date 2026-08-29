import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { PrismaService } from "../prisma/prisma.service";
describe("InvoicesService", () => {
  let service: InvoicesService;
  let prisma: any;
  const staffUser = { sub: "staff-1", role: "ACCOUNTANT", hospitalId: "hosp-1" };
  const otherHospitalStaff = { sub: "staff-2", role: "ACCOUNTANT", hospitalId: "hosp-2" };
  const superAdmin = { sub: "admin-1", role: "SUPER_ADMIN", hospitalId: null };
  const patientUser = { sub: "patient-user-1", role: "PATIENT", hospitalId: null };
  beforeEach(async () => {
    prisma = {
      appointment: { findUnique: jest.fn() },
      invoice: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      patient: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
    jest.clearAllMocks();
  });
  describe("create", () => {
    const dto = { appointmentId: "appt-1" } as any;
    it("throws NotFoundException if the appointment does not exist", async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, staffUser)).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException for staff from a different hospital", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        patientId: "patient-1",
      });
      await expect(service.create(dto, otherHospitalStaff)).rejects.toThrow(ForbiddenException);
    });
    it("throws ConflictException if an invoice already exists for this appointment", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        patientId: "patient-1",
      });
      prisma.invoice.findUnique.mockResolvedValue({ id: "existing-invoice" });
      await expect(service.create(dto, staffUser)).rejects.toThrow(ConflictException);
    });
    it("creates a DRAFT invoice tied to the appointment's patient and hospital", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        patientId: "patient-1",
      });
      prisma.invoice.findUnique.mockResolvedValue(null);
      prisma.invoice.create.mockResolvedValue({ id: "invoice-1" });
      const result = await service.create(dto, staffUser);
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: { appointmentId: "appt-1", patientId: "patient-1", hospitalId: "hosp-1" },
      });
      expect(result).toEqual({ id: "invoice-1" });
    });
  });
  describe("addItem", () => {
    const dto = { description: "X-Ray", category: "LAB", amount: 500 } as any;
    it("throws NotFoundException if the invoice does not exist", async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.addItem("invoice-1", dto, staffUser)).rejects.toThrow(NotFoundException);
    });
    it("throws ConflictException if the invoice is not in DRAFT status", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "invoice-1",
        hospitalId: "hosp-1",
        status: "FINALIZED",
      });
      await expect(service.addItem("invoice-1", dto, staffUser)).rejects.toThrow(ConflictException);
    });
    it("adds the item inside a transaction and recomputes totalAmount from all items", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "invoice-1",
        hospitalId: "hosp-1",
        status: "DRAFT",
      });
      const txInvoiceItemCreate = jest.fn().mockResolvedValue({});
      const txInvoiceItemFindMany = jest
        .fn()
        .mockResolvedValue([{ amount: 500 }, { amount: 300 }]);
      const txInvoiceUpdate = jest.fn().mockResolvedValue({
        id: "invoice-1",
        totalAmount: 800,
        items: [{ amount: 500 }, { amount: 300 }],
      });
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          invoiceItem: { create: txInvoiceItemCreate, findMany: txInvoiceItemFindMany },
          invoice: { update: txInvoiceUpdate },
        }),
      );
      const result = await service.addItem("invoice-1", dto, staffUser);
      expect(txInvoiceItemCreate).toHaveBeenCalledWith({
        data: { invoiceId: "invoice-1", description: "X-Ray", category: "LAB", amount: 500 },
      });
      expect(txInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: "invoice-1" },
        data: { totalAmount: 800 },
        include: { items: true },
      });
      expect(result.totalAmount).toBe(800);
    });
  });
  describe("finalize", () => {
    it("throws ConflictException if the invoice is not DRAFT", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "invoice-1",
        hospitalId: "hosp-1",
        status: "PAID",
      });
      await expect(service.finalize("invoice-1", staffUser)).rejects.toThrow(ConflictException);
    });
    it("moves a DRAFT invoice to FINALIZED", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "invoice-1",
        hospitalId: "hosp-1",
        status: "DRAFT",
      });
      prisma.invoice.update.mockResolvedValue({ id: "invoice-1", status: "FINALIZED" });
      const result = await service.finalize("invoice-1", staffUser);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "invoice-1" },
        data: { status: "FINALIZED" },
      });
      expect(result.status).toBe("FINALIZED");
    });
  });
  describe("markPaid", () => {
    it("throws ConflictException if the invoice is not FINALIZED", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "invoice-1",
        hospitalId: "hosp-1",
        status: "DRAFT",
      });
      await expect(service.markPaid("invoice-1", staffUser)).rejects.toThrow(ConflictException);
    });
    it("moves a FINALIZED invoice to PAID", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "invoice-1",
        hospitalId: "hosp-1",
        status: "FINALIZED",
      });
      prisma.invoice.update.mockResolvedValue({ id: "invoice-1", status: "PAID" });
      const result = await service.markPaid("invoice-1", staffUser);
      expect(result.status).toBe("PAID");
    });
  });
  describe("findOne", () => {
    it("throws NotFoundException if the invoice does not exist", async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.findOne("invoice-1", staffUser)).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException when a PATIENT requests someone else's invoice", async () => {
      prisma.invoice.findUnique.mockResolvedValue({ id: "invoice-1", patientId: "patient-1" });
      prisma.patient.findUnique.mockResolvedValue({ id: "a-different-patient" });
      await expect(service.findOne("invoice-1", patientUser)).rejects.toThrow(ForbiddenException);
    });
    it("allows a PATIENT to view their own invoice", async () => {
      prisma.invoice.findUnique.mockResolvedValue({ id: "invoice-1", patientId: "patient-1" });
      prisma.patient.findUnique.mockResolvedValue({ id: "patient-1" });
      const result = await service.findOne("invoice-1", patientUser);
      expect(result.id).toBe("invoice-1");
    });
    it("throws ForbiddenException for staff from a different hospital", async () => {
      prisma.invoice.findUnique.mockResolvedValue({ id: "invoice-1", hospitalId: "hosp-1" });
      await expect(service.findOne("invoice-1", otherHospitalStaff)).rejects.toThrow(ForbiddenException);
    });
    it("allows SUPER_ADMIN to view any invoice regardless of hospital", async () => {
      prisma.invoice.findUnique.mockResolvedValue({ id: "invoice-1", hospitalId: "hosp-1" });
      const result = await service.findOne("invoice-1", superAdmin);
      expect(result.id).toBe("invoice-1");
    });
  });
  describe("findMany", () => {
    it("throws ForbiddenException if staff has no hospitalId assigned", async () => {
      await expect(
        service.findMany({ sub: "s1", role: "ACCOUNTANT", hospitalId: null }),
      ).rejects.toThrow(ForbiddenException);
    });
    it("scopes the query to the staff member's hospital", async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      await service.findMany(staffUser);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "FINALIZED", hospitalId: "hosp-1" },
        }),
      );
    });
    it("does not scope by hospital for SUPER_ADMIN", async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      await service.findMany(superAdmin);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "FINALIZED" } }),
      );
    });
  });
  describe("getSuggestedCharges", () => {
    it("throws NotFoundException if the appointment does not exist", async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);
      await expect(
        service.getSuggestedCharges("appt-1", staffUser),
      ).rejects.toThrow(NotFoundException);
    });
    it("includes consultation fee, only APPROVED-returned lab tests, and only actually-dispensed medicines", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        doctor: {
          consultationFee: 700,
          user: { firstName: "Asha", lastName: "Rao" },
        },
        medicalRecords: {
          labOrders: [
            {
              items: [{ labTest: { name: "CBC", price: 250 } }],
            },
          ],
          prescriptions: [
            {
              items: [
                {
                  medicine: { name: "Paracetamol" },
                  dispensations: [
                    { quantity: 2, medicineBatch: { mrp: 10 } },
                  ],
                },
                {
                  // prescribed but never dispensed — must NOT appear in suggestions
                  medicine: { name: "Ibuprofen" },
                  dispensations: [],
                },
              ],
            },
          ],
        },
      });
      const result = await service.getSuggestedCharges("appt-1", staffUser);
      expect(result).toEqual([
        { description: "Consultation — Dr. Asha Rao", category: "CONSULTATION", amount: 700 },
        { description: "Lab Test — CBC", category: "LAB", amount: 250 },
        { description: "Pharmacy — Paracetamol x2", category: "PHARMACY", amount: 20 },
      ]);
    });
  });
  describe("findMine", () => {
    it("returns an empty array if the current user has no patient record", async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      const result = await service.findMine({ sub: "user-1" });
      expect(result).toEqual([]);
      expect(prisma.invoice.findMany).not.toHaveBeenCalled();
    });
    it("returns the patient's own invoices, newest first", async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: "patient-1" });
      prisma.invoice.findMany.mockResolvedValue([{ id: "invoice-1" }]);
      const result = await service.findMine({ sub: "user-1" });
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: "patient-1" },
          orderBy: { createdAt: "desc" },
        }),
      );
      expect(result).toEqual([{ id: "invoice-1" }]);
    });
  });
});
