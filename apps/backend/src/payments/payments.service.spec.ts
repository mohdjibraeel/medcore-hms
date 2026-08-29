process.env.RAZORPAY_KEY_ID = "test_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";
import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import * as crypto from "crypto";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
const mockOrdersCreate = jest.fn();
const mockRazorpayInstance = { orders: { create: mockOrdersCreate } };
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => mockRazorpayInstance);
});
describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: any;
  let notificationsService: any;
  beforeEach(async () => {
    prisma = {
      invoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      patient: {
        findUnique: jest.fn(),
      },
    };
    notificationsService = {
      sendEmail: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });
  describe("createOrder", () => {
    const invoice = {
      id: "invoice-1",
      totalAmount: 1234.56,
      patientId: "patient-1",
      hospitalId: "hosp-1",
    };
    it("throws NotFoundException if the invoice does not exist", async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.createOrder("invoice-1", { sub: "u1", role: "PATIENT", hospitalId: null }),
      ).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException when a PATIENT tries to pay someone else's invoice", async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);
      prisma.patient.findUnique.mockResolvedValue({ id: "a-different-patient" });
      await expect(
        service.createOrder("invoice-1", { sub: "u1", role: "PATIENT", hospitalId: null }),
      ).rejects.toThrow(ForbiddenException);
    });
    it("throws ForbiddenException when staff from a different hospital tries to access the invoice", async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);
      await expect(
        service.createOrder("invoice-1", { sub: "u1", role: "ACCOUNTANT", hospitalId: "a-different-hospital" }),
      ).rejects.toThrow(ForbiddenException);
    });
    it("allows SUPER_ADMIN to create an order regardless of hospital", async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);
      mockOrdersCreate.mockResolvedValue({ id: "order_123", amount: 123456, currency: "INR" });
      prisma.invoice.update.mockResolvedValue({});
      const result = await service.createOrder("invoice-1", {
        sub: "admin-1",
        role: "SUPER_ADMIN",
        hospitalId: null,
      });
      expect(result.orderId).toBe("order_123");
    });
    it("converts the invoice total to paise correctly and persists the Razorpay order id", async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoice);
      prisma.patient.findUnique.mockResolvedValue({ id: "patient-1" });
      mockOrdersCreate.mockResolvedValue({ id: "order_123", amount: 123456, currency: "INR" });
      prisma.invoice.update.mockResolvedValue({});
      await service.createOrder("invoice-1", { sub: "u1", role: "PATIENT", hospitalId: null });
      expect(mockOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 123456, currency: "INR", receipt: "invoice-1" }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "invoice-1" },
        data: { razorpayOrderId: "order_123" },
      });
    });
  });
  describe("handleWebhook", () => {
    function sign(body: Buffer, secret: string) {
      return crypto.createHmac("sha256", secret).update(body).digest("hex");
    }
    it("throws ForbiddenException on an invalid signature and never touches the database", async () => {
      const body = Buffer.from(JSON.stringify({ event: "payment.captured" }));
      await expect(
        service.handleWebhook(body, "not-a-real-signature"),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
    });
    it("ignores events other than payment.captured", async () => {
      const payload = { event: "payment.failed" };
      const body = Buffer.from(JSON.stringify(payload));
      const signature = sign(body, "test_webhook_secret");
      const result = await service.handleWebhook(body, signature);
      expect(result).toEqual({ status: "ignored", event: "payment.failed" });
    });
    it("throws NotFoundException when the payload has no order_id", async () => {
      const payload = { event: "payment.captured", payload: { payment: { entity: {} } } };
      const body = Buffer.from(JSON.stringify(payload));
      const signature = sign(body, "test_webhook_secret");
      await expect(service.handleWebhook(body, signature)).rejects.toThrow(NotFoundException);
    });
    it("throws NotFoundException when no invoice matches the order_id", async () => {
      const payload = {
        event: "payment.captured",
        payload: { payment: { entity: { order_id: "order_123" } } },
      };
      const body = Buffer.from(JSON.stringify(payload));
      const signature = sign(body, "test_webhook_secret");
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.handleWebhook(body, signature)).rejects.toThrow(NotFoundException);
    });
    it("is idempotent — does not re-process or re-email an already-PAID invoice", async () => {
      const payload = {
        event: "payment.captured",
        payload: { payment: { entity: { order_id: "order_123" } } },
      };
      const body = Buffer.from(JSON.stringify(payload));
      const signature = sign(body, "test_webhook_secret");
      prisma.invoice.findUnique.mockResolvedValue({ id: "invoice-1", status: "PAID" });
      const result = await service.handleWebhook(body, signature);
      expect(result).toEqual({ status: "already_processed", invoiceId: "invoice-1" });
      expect(prisma.invoice.update).not.toHaveBeenCalled();
      expect(notificationsService.sendEmail).not.toHaveBeenCalled();
    });
    it("marks the invoice PAID and emails a receipt on first successful processing", async () => {
      const payload = {
        event: "payment.captured",
        payload: { payment: { entity: { order_id: "order_123" } } },
      };
      const body = Buffer.from(JSON.stringify(payload));
      const signature = sign(body, "test_webhook_secret");
      prisma.invoice.findUnique.mockResolvedValue({ id: "invoice-1", status: "PENDING" });
      prisma.invoice.update.mockResolvedValue({
        id: "invoice-1",
        totalAmount: 500,
        patient: { user: { email: "patient@medcore.demo", firstName: "Asha" } },
      });
      const result = await service.handleWebhook(body, signature);
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "invoice-1" }, data: { status: "PAID" } }),
      );
      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        "patient@medcore.demo",
        expect.objectContaining({ subject: expect.stringContaining("Payment Received") }),
      );
      expect(result).toEqual({ status: "processed", invoiceId: "invoice-1" });
    });
  });
});
