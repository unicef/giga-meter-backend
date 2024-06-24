import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dailycheckapp_contact_contactmessage as MessageModel } from '@prisma/client';
import { MessagesDto } from './messages.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async messages(params: {
    skip?: number;
    take?: number;
  }): Promise<MessagesDto[]> {
    const { skip, take } = params;
    const messages = this.prisma.dailycheckapp_contact_contactmessage.findMany({
      skip,
      take,
    });
    return (await messages).map(this.toDto);
  }

  private toDto(msg: MessageModel): MessagesDto {
    return {
      id: msg.id.toString(),
      created_date: msg.created.toISOString(),
      modified_date: msg.modified.toISOString(),
      firstname: msg.firstname,
      lastname: msg.lastname,
      school_id: msg.school_id,
      email: msg.email,
      message: msg.message,
      created_at: msg.created_at,
    };
  }
}
