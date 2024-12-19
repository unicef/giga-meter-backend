import { BadRequestException, Injectable } from '@nestjs/common';
import { ConnectivityDto } from './connectivity.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { existSchool } from 'src/utility/utility';

@Injectable()
export class ConnectivityService {
  constructor(private prisma: PrismaService) {}
  async create(createConnectivityDto: ConnectivityDto) {
    if (
      (await existSchool(this.prisma, createConnectivityDto.giga_id_school)) ===
      false
    )
      throw new BadRequestException('School does not exist');
    try {
      await this.prisma.connectivity_ping_checks.create({
        data: {
          ...createConnectivityDto,
        },
      });
      return createConnectivityDto;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('School does not exist');
    }
  }
  async findAll(giga_id_school: string) {
    try {
      const data = await this.prisma.connectivity_ping_checks.findMany({
        where: {
          giga_id_school,
        },
      });
      return data;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('School does not exist');
    }
  }

  async findOne(id: number) {
    return await this.prisma.connectivity_ping_checks.findUnique({
      where: {
        id,
      },
    });
  }
}
