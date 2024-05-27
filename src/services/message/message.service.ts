import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_contact_contactmessage } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async messages(params: {
    skip?: number;
    take?: number;
  }): Promise<dailycheckapp_contact_contactmessage[]> {
    const { skip, take } = params;
    return this.prisma.dailycheckapp_contact_contactmessage.findMany({
      skip,
      take,
    });
  }
}
