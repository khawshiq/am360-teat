import { prisma } from "./prisma";

// A trainer cannot be booked in overlapping time on the same weekday (any branch).
export async function trainerHasConflict(academy_id: string, trainer_id: string, day_of_week: number, start: string, end: string, excludeId?: string) {
  const same = await prisma.schedule.findMany({ where: { academy_id, trainer_id, day_of_week } });
  return same.some((s: any) => s.id !== excludeId && start < s.end_time && s.start_time < end);
}
