import { prisma } from "@/lib/prisma";

// All Prisma access for WhatsAppIntegration lives here — WhatsAppIntegrationService
// (service.ts) never touches `prisma` directly, only this object.
export const whatsappIntegrationRepository = {
  findByAcademy: (academy_id: string) => prisma.whatsAppIntegration.findUnique({ where: { academy_id } }),

  upsert: (academy_id: string, create: any, update: any) =>
    prisma.whatsAppIntegration.upsert({
      where: { academy_id },
      create: { academy_id, ...create },
      update,
    }),

  updateStatus: (academy_id: string, data: any) =>
    prisma.whatsAppIntegration.update({ where: { academy_id }, data }),

  deactivate: (academy_id: string) =>
    prisma.whatsAppIntegration.update({ where: { academy_id }, data: { status: "disconnected" } }),
};
