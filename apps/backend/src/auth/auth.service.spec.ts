import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt/dist/jwt.service";
import { RedisService } from "../redis/redis.service";
import { NotificationsService } from "../notifications/notifications.service";
import * as bcrypt from "bcrypt";
jest.mock("bcrypt");
describe("AuthService", () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let redisService: any;
  let notificationsService: any;
  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      patient: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    redisService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn(),
    };
    notificationsService = {
      sendEmail: jest.fn(),
      sendSms: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });
  describe("register", () => {
    const dto = {
      email: "new@medcore.demo",
      password: "Demo@123",
      firstName: "New",
      lastName: "User",
      phone: "+911234567890",
      dateOfBirth: "1990-01-01",
    } as any;
    it("throws ConflictException if email already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    it("creates a user + patient, hashes password, sends an OTP email, and never returns the raw password", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      const createdUser = {
        id: "user-1",
        email: dto.email,
        password: "hashed-password",
        role: "PATIENT",
      };
      const createdPatient = { id: "patient-1", userId: "user-1" };
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue(createdUser) },
          patient: { create: jest.fn().mockResolvedValue(createdPatient) },
        }),
      );
      const result = await service.register(dto);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(result.user).not.toHaveProperty("password");
      expect(result.patient).toEqual(createdPatient);
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining("otp:email:"),
        expect.any(String),
        600,
      );
      expect(notificationsService.sendEmail).toHaveBeenCalledWith(
        dto.email,
        expect.objectContaining({ subject: expect.any(String) }),
      );
    });
  });
  describe("login", () => {
    const dto = { email: "user@medcore.demo", password: "Demo@123" } as any;
    it("throws UnauthorizedException when the user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
    it("throws UnauthorizedException when the password does not match", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        password: "hashed",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
    it("returns access + refresh tokens and stores the refresh token in Redis on success", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: dto.email,
        password: "hashed",
        role: "DOCTOR",
        hospitalId: "hosp-1",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token");
      const result = await service.login(dto);
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.deviceId).toEqual(expect.any(String));
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining(`rt:user-1:${result.deviceId}`),
        "refresh-token",
        60 * 60 * 24 * 7,
      );
    });
  });
  describe("getMe", () => {
    it("throws UnauthorizedException if the user no longer exists", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe("ghost-id")).rejects.toThrow(UnauthorizedException);
    });
    it("returns the user without the password field, plus role permissions", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "a@b.com",
        password: "hashed",
        role: "PATIENT",
      });
      const result = await service.getMe("user-1");
      expect(result).not.toHaveProperty("password");
      expect(result).toHaveProperty("permissions");
    });
  });
  describe("refresh", () => {
    it("throws UnauthorizedException when the JWT itself is invalid or expired", async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error("bad token"));
      await expect(service.refresh("bad-token", "device-1")).rejects.toThrow(
        UnauthorizedException,
      );
    });
    it("throws and deletes the Redis key on refresh-token reuse (token valid but doesn't match what's stored)", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: "user-1" });
      redisService.get.mockResolvedValue("a-different-stored-token");
      await expect(
        service.refresh("presented-token", "device-1"),
      ).rejects.toThrow(UnauthorizedException);
      expect(redisService.del).toHaveBeenCalledWith("rt:user-1:device-1");
    });
    it("issues a new token pair and rotates the stored refresh token on success", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: "user-1" });
      redisService.get.mockResolvedValue("matching-token");
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "a@b.com",
        role: "DOCTOR",
        hospitalId: "hosp-1",
      });
      jwtService.signAsync
        .mockResolvedValueOnce("new-access-token")
        .mockResolvedValueOnce("new-refresh-token");
      const result = await service.refresh("matching-token", "device-1");
      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
      expect(redisService.set).toHaveBeenCalledWith(
        "rt:user-1:device-1",
        "new-refresh-token",
        60 * 60 * 24 * 7,
      );
    });
  });
  describe("forgotPassword", () => {
    it("returns the same generic message whether or not the email exists (no user-enumeration leak)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const resultForUnknown = await service.forgotPassword({
        email: "ghost@medcore.demo",
      } as any);
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", email: "a@b.com" });
      const resultForKnown = await service.forgotPassword({
        email: "a@b.com",
      } as any);
      expect(resultForUnknown).toEqual(resultForKnown);
      expect(notificationsService.sendEmail).toHaveBeenCalledTimes(1);
    });
  });
  describe("resetPassword", () => {
    it("throws UnauthorizedException for an invalid or expired token", async () => {
      redisService.get.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: "bad", newPassword: "New@123" } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
    it("hashes the new password, deletes the reset token, and revokes every active session", async () => {
      redisService.get.mockResolvedValue("user-1");
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hashed-password");
      await service.resetPassword({
        token: "good-token",
        newPassword: "New@123",
      } as any);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { password: "new-hashed-password" },
      });
      expect(redisService.del).toHaveBeenCalledWith("pwreset:good-token");
      expect(redisService.delByPattern).toHaveBeenCalledWith("rt:user-1:*");
    });
  });
});
