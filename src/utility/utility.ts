// Functions

import { PrismaService } from 'src/prisma/prisma.service';

/**
 * The form stored for a giga id: trimmed and lowercased.
 * An empty or missing id stays empty so callers can treat it as absent.
 */
export const normalizeGigaId = (giga_id_school?: string | null): string =>
  giga_id_school?.trim().toLowerCase() ?? '';

export const existSchool = async (
  prisma: PrismaService,
  giga_id_school: string,
) => {
  const school = await prisma.dailycheckapp_school.findFirst({
    where: {
      giga_id_school: giga_id_school,
    },
  });
  return school ? true : false;
};

export const getDateFromString = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};
