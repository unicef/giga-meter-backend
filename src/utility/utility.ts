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
  giga_id_school?: string | null,
) => {
  const gigaId = normalizeGigaId(giga_id_school);
  if (!gigaId) {
    return false;
  }
  // Exact match on the normalized id. `mode: 'insensitive'` is an unescaped
  // ILIKE, which cannot use the giga_id_school index and treats % and _ as
  // wildcards. Existing rows are lowercased by migration.
  const school = await prisma.dailycheckapp_school.findFirst({
    where: { giga_id_school: gigaId },
    select: { id: true },
  });
  return !!school;
};

export function serializeBigInt(value: any): any {
  if (typeof value === 'bigint') {
    return Number(value); // or value.toString()
  }

  if (Array.isArray(value)) {
    const result = [];
    for (let i = 0; i < value.length; i++) {
      result.push(serializeBigInt(value[i]));
    }
    return result;
  }

  if (value !== null && typeof value === 'object') {
    const obj: any = value;
    for (const key in value) {
      obj[key] = serializeBigInt(value[key]);
    }
    return obj;
  }

  return value;
}
export const getDateFromString = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};
