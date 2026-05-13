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
