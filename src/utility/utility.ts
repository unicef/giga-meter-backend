// Functions

import { PrismaService } from 'src/prisma/prisma.service';

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
