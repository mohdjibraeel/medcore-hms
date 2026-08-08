import { ForbiddenException } from "@nestjs/common";
import { Role } from "generated/prisma/enums";

export function assertSameHospital(
  requesterHospitalId: string | null,
  resourceHospitalId: string,
  requesterRole: Role,
) {
  if (requesterRole === 'SUPER_ADMIN') return;
  if (requesterHospitalId !== resourceHospitalId) {
    throw new ForbiddenException('You do not have access to this hospital\'s resource');
  }
}