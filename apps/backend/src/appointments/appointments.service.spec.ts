import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { NotificationsService } from "../notifications/notifications.service";
describe("AppointmentsService", () => {
  let service: AppointmentsService;
  let prisma: any;
  let notificationsGateway: any;
  let notificationsService: any;
  const staffUser = { sub: "staff-1", role: "RECEPTIONIST", hospitalId: "hosp-1" };
  const otherHospitalStaff = { sub: "staff-2", role: "RECEPTIONIST", hospitalId: "hosp-2" };
  const superAdmin = { sub: "admin-1", role: "SUPER_ADMIN", hospitalId: null };
  const patientUser = { sub: "patient-user-1", role: "PATIENT", hospitalId: null };
  const doctorUser = { sub: "doctor-user-1", role: "DOCTOR", hospitalId: "hosp-1" };
  beforeEach(async () => {
    prisma = {
      doctor: { findUnique: jest.fn() },
      patient: { findUnique: jest.fn() },
      department: { findUnique: jest.fn() },
      hospital: { findUnique: jest.fn() },
      appointment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    notificationsGateway = { emitToUser: jest.fn() };
    notificationsService = { sendEmail: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: notificationsGateway },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });
  describe("getAvailability", () => {
    it("throws NotFoundException if the doctor does not exist", async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);
      await expect(service.getAvailability("doc-1", "2026-09-01")).rejects.toThrow(
        NotFoundException,
      );
    });
    it("generates 30-minute slots from 9am-5pm IST and marks booked ones unavailable", async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: "doc-1" });
      prisma.appointment.findMany.mockResolvedValue([]);
      const result = await service.getAvailability("doc-1", "2026-09-01");
      // 9:00 to 16:30 in 30-min steps = 16 slots
      expect(result.slots).toHaveLength(16);
      expect(result.slots[0].time).toBe("09:00");
      expect(result.slots.every((s: any) => s.available)).toBe(true);
    });
    it("marks a slot unavailable when an appointment already occupies it", async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: "doc-1" });
      // 9:00 AM IST == 03:30 UTC
      const bookedUtc = new Date("2026-09-01T03:30:00.000Z");
      prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: bookedUtc }]);
      const result = await service.getAvailability("doc-1", "2026-09-01");
      const nineAmSlot = result.slots.find((s: any) => s.time === "09:00");
      expect(nineAmSlot.available).toBe(false);
    });
  });
  describe("create", () => {
    const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const dto = {
      doctorId: "doc-1",
      departmentId: "dept-1",
      hospitalId: "hosp-1",
      scheduledAt: futureIso,
    } as any;
    function mockAllLookupsFound() {
      prisma.patient.findUnique.mockResolvedValue({ id: "patient-1" });
      prisma.doctor.findUnique.mockResolvedValue({ id: "doc-1" });
      prisma.department.findUnique.mockResolvedValue({ id: "dept-1" });
      prisma.hospital.findUnique.mockResolvedValue({ id: "hosp-1" });
    }
    it("throws NotFoundException when a PATIENT has no patient profile", async () => {
      prisma.patient.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(dto, patientUser)).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException when staff books without providing patientId", async () => {
      await expect(service.create({ ...dto, patientId: undefined }, staffUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
    it("throws NotFoundException if the doctor does not exist", async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: "patient-1" });
      prisma.doctor.findUnique.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue({ id: "dept-1" });
      prisma.hospital.findUnique.mockResolvedValue({ id: "hosp-1" });
      await expect(
        service.create({ ...dto, patientId: "patient-1" }, staffUser),
      ).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException when staff books for a different hospital than their own", async () => {
      mockAllLookupsFound();
      await expect(
        service.create({ ...dto, patientId: "patient-1" }, otherHospitalStaff),
      ).rejects.toThrow(ForbiddenException);
    });
    it("throws BadRequestException when the scheduled time is in the past", async () => {
      mockAllLookupsFound();
      const pastDto = { ...dto, patientId: "patient-1", scheduledAt: "2020-01-01T10:00:00.000Z" };
      await expect(service.create(pastDto, staffUser)).rejects.toThrow(BadRequestException);
    });
    it("throws ConflictException when the doctor already has an appointment at that exact time", async () => {
      mockAllLookupsFound();
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          $queryRaw: jest.fn().mockResolvedValue(undefined),
          appointment: {
            findFirst: jest.fn().mockResolvedValue({ id: "existing-appt" }),
            create: jest.fn(),
          },
        }),
      );
      await expect(
        service.create({ ...dto, patientId: "patient-1" }, staffUser),
      ).rejects.toThrow(ConflictException);
    });
    it("creates the appointment inside a transaction with a row lock, when the slot is free", async () => {
      mockAllLookupsFound();
      const txAppointmentCreate = jest.fn().mockResolvedValue({ id: "appt-1" });
      const txQueryRaw = jest.fn().mockResolvedValue(undefined);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          $queryRaw: txQueryRaw,
          appointment: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: txAppointmentCreate,
          },
        }),
      );
      const result = await service.create({ ...dto, patientId: "patient-1" }, staffUser);
      expect(txQueryRaw).toHaveBeenCalled();
      expect(txAppointmentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: "patient-1",
            doctorId: "doc-1",
            isEmergency: false,
          }),
        }),
      );
      expect(result).toEqual({ id: "appt-1" });
    });
  });
  describe("findMine", () => {
    it("throws NotFoundException for a DOCTOR with no doctor profile", async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);
      await expect(service.findMine({ sub: "u1", role: "DOCTOR" })).rejects.toThrow(
        NotFoundException,
      );
    });
    it("returns the doctor's own appointments", async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: "doc-1" });
      prisma.appointment.findMany.mockResolvedValue([{ id: "appt-1" }]);
      const result = await service.findMine({ sub: "u1", role: "DOCTOR" });
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { doctorId: "doc-1" } }),
      );
      expect(result).toEqual([{ id: "appt-1" }]);
    });
    it("throws NotFoundException for a PATIENT with no patient profile", async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      await expect(service.findMine({ sub: "u1", role: "PATIENT" })).rejects.toThrow(
        NotFoundException,
      );
    });
    it("returns the patient's own appointments", async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: "patient-1" });
      prisma.appointment.findMany.mockResolvedValue([{ id: "appt-1" }]);
      const result = await service.findMine({ sub: "u1", role: "PATIENT" });
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: "patient-1" } }),
      );
      expect(result).toEqual([{ id: "appt-1" }]);
    });
  });
  describe("findByPatient", () => {
    it("scopes results to the staff member's hospital", async () => {
      prisma.appointment.findMany.mockResolvedValue([]);
      await service.findByPatient("patient-1", staffUser);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: "patient-1", hospitalId: "hosp-1" },
        }),
      );
    });
    it("does not scope by hospital for SUPER_ADMIN", async () => {
      prisma.appointment.findMany.mockResolvedValue([]);
      await service.findByPatient("patient-1", superAdmin);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: "patient-1" } }),
      );
    });
  });
  describe("updateStatus", () => {
    it("throws NotFoundException if the appointment does not exist", async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus("appt-1", { status: "CONFIRMED" } as any, staffUser),
      ).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException for staff from a different hospital", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        status: "PENDING",
      });
      await expect(
        service.updateStatus("appt-1", { status: "CONFIRMED" } as any, otherHospitalStaff),
      ).rejects.toThrow(ForbiddenException);
    });
    it("throws ForbiddenException when a DOCTOR tries to update someone else's appointment", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        doctorId: "doc-1",
        status: "PENDING",
      });
      prisma.doctor.findUnique.mockResolvedValue({ id: "a-different-doctor" });
      await expect(
        service.updateStatus("appt-1", { status: "CONFIRMED" } as any, doctorUser),
      ).rejects.toThrow(ForbiddenException);
    });
    it("throws ConflictException on an invalid status transition (e.g. COMPLETED -> CONFIRMED)", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        status: "COMPLETED",
      });
      await expect(
        service.updateStatus("appt-1", { status: "CONFIRMED" } as any, staffUser),
      ).rejects.toThrow(ConflictException);
    });
    it("on a valid transition: updates status, notifies the patient via gateway, and emails on CONFIRMED", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        status: "PENDING",
      });
      prisma.appointment.update.mockResolvedValue({
        id: "appt-1",
        patientId: "patient-1",
        status: "CONFIRMED",
        scheduledAt: new Date("2026-09-01T10:00:00.000Z"),
      });
      prisma.patient.findUnique.mockResolvedValue({ userId: "patient-user-1" });
      prisma.user.findUnique.mockResolvedValue({
        email: "patient@medcore.demo",
        firstName: "Asha",
      });
      const result = await service.updateStatus(
        "appt-1",
        { status: "CONFIRMED" } as any,
        staffUser,
      );
      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appt-1" },
        data: { status: "CONFIRMED" },
      });
      expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
        "patient-user-1",
        "appointment-status-changed",
        expect.objectContaining({ appointmentId: "appt-1", status: "CONFIRMED" }),
      );
      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        "patient@medcore.demo",
        expect.objectContaining({ subject: expect.stringContaining("confirmed") }),
      );
      expect(result.status).toBe("CONFIRMED");
    });
    it("does not send an email for transitions other than CONFIRMED (e.g. IN_PROGRESS)", async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: "appt-1",
        hospitalId: "hosp-1",
        status: "CONFIRMED",
      });
      prisma.appointment.update.mockResolvedValue({
        id: "appt-1",
        patientId: "patient-1",
        status: "IN_PROGRESS",
      });
      prisma.patient.findUnique.mockResolvedValue({ userId: "patient-user-1" });
      await service.updateStatus("appt-1", { status: "IN_PROGRESS" } as any, staffUser);
      expect(notificationsService.sendEmail).not.toHaveBeenCalled();
    });
  });
  describe("findTodayForHospital", () => {
    it("throws ForbiddenException if staff has no hospitalId assigned", async () => {
      await expect(
        service.findTodayForHospital({ sub: "s1", role: "RECEPTIONIST", hospitalId: null }),
      ).rejects.toThrow(ForbiddenException);
    });
    it("scopes today's appointments to the staff member's hospital", async () => {
      prisma.appointment.findMany.mockResolvedValue([]);
      await service.findTodayForHospital(staffUser);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hospitalId: "hosp-1" }),
        }),
      );
    });
    it("does not scope by hospital for SUPER_ADMIN", async () => {
      prisma.appointment.findMany.mockResolvedValue([]);
      await service.findTodayForHospital(superAdmin);
      const callArg = prisma.appointment.findMany.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty("hospitalId");
    });
  });
  describe("findOne", () => {
    it("throws NotFoundException if the appointment does not exist", async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);
      await expect(service.findOne("appt-1", staffUser)).rejects.toThrow(NotFoundException);
    });
    it("throws ForbiddenException when a PATIENT requests someone else's appointment", async () => {
      prisma.appointment.findUnique.mockResolvedValue({ id: "appt-1", patientId: "patient-1" });
      prisma.patient.findUnique.mockResolvedValue({ id: "a-different-patient" });
      await expect(service.findOne("appt-1", patientUser)).rejects.toThrow(ForbiddenException);
    });
    it("throws ForbiddenException when a DOCTOR requests an appointment that isn't theirs", async () => {
      prisma.appointment.findUnique.mockResolvedValue({ id: "appt-1", doctorId: "doc-1" });
      prisma.doctor.findUnique.mockResolvedValue({ id: "a-different-doctor" });
      await expect(service.findOne("appt-1", doctorUser)).rejects.toThrow(ForbiddenException);
    });
    it("throws ForbiddenException for staff viewing an appointment at a different hospital", async () => {
      prisma.appointment.findUnique.mockResolvedValue({ id: "appt-1", hospitalId: "hosp-1" });
      await expect(service.findOne("appt-1", otherHospitalStaff)).rejects.toThrow(
        ForbiddenException,
      );
    });
    it("allows SUPER_ADMIN to view any appointment", async () => {
      prisma.appointment.findUnique.mockResolvedValue({ id: "appt-1", hospitalId: "hosp-1" });
      const result = await service.findOne("appt-1", superAdmin);
      expect(result.id).toBe("appt-1");
    });
  });
});
