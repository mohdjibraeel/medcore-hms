import { registerAs } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export const bullMQConfig = registerAs(
  'bullmq',
  (): BullRootModuleOptions => ({
    connection: {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
    },
  }),
);