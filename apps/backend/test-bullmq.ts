import { BullRootModuleOptions } from '@nestjs/bullmq';

export function getBullMQConfig(): BullRootModuleOptions {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not set in environment variables');
  }

  return {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null,
    },
  };
}