import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSchoolRegistrationDto,
  RejectSchoolRegistrationDto,
  SchoolRegistrationResponseDto,
  SchoolRegistrationVerificationPayloadDto,
} from './school-registration.dto';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SchoolRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async createRegistration(
    registrationDto: CreateSchoolRegistrationDto,
  ): Promise<SchoolRegistrationResponseDto> {
    const now = new Date();
    const gigaId = uuidv4().toLowerCase();
    const normalizedSchoolId = this.normalizeSchoolId(registrationDto.school_id);

    await this.ensureSchoolIdIsAvailable(normalizedSchoolId);

    const registrationData = {
      school_id: normalizedSchoolId,
      school_name: registrationDto.school_name,
      country_iso3_code: registrationDto.country_iso3_code,
      latitude: registrationDto.latitude,
      longitude: registrationDto.longitude,
      address: registrationDto.address,
      education_level: registrationDto.education_level,
      contact_name: registrationDto.contact_name,
      contact_email: registrationDto.contact_email,
      giga_id_school: gigaId,
      verification_status: 'PENDING',
      verification_requested_at: null,
      verification_error: null,
      modified: now,
    };

    const savedRegistration = await this.prisma.school_new_registration.create({
      data: {
        ...registrationData,
        created: now,
      },
    });

    await this.dispatchVerification(savedRegistration);

    const refreshedRegistration =
      await this.prisma.school_new_registration.findFirstOrThrow({
        where: {
          id: savedRegistration.id,
        },
      });

    return this.toResponseDto(refreshedRegistration);
  }

  async rejectRegistration(
    rejectionDto: RejectSchoolRegistrationDto,
  ): Promise<SchoolRegistrationResponseDto> {
    const gigaId = this.normalizeGigaId(rejectionDto.giga_id_school);
    const now = new Date();

    const activeRegistration =
      await this.prisma.school_new_registration.findFirst({
        where: {
          giga_id_school: gigaId,
          deleted: null,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    if (rejectionDto.is_deleted && activeRegistration) {
      const updatedRegistration =
        await this.prisma.school_new_registration.update({
          where: {
            id: activeRegistration.id,
          },
          data: {
            deleted: now,
            modified: now,
            verification_status: 'REJECTED',
          },
        });

      return this.toResponseDto(updatedRegistration);
    }

    const latestRegistration =
      activeRegistration ??
      (await this.prisma.school_new_registration.findFirst({
        where: {
          giga_id_school: gigaId,
        },
        orderBy: {
          created_at: 'desc',
        },
      }));

    if (!latestRegistration) {
      return {
        giga_id_school: gigaId,
        verification_status: rejectionDto.is_deleted
          ? 'REJECTED'
          : 'PENDING',
      };
    }

    return this.toResponseDto(latestRegistration);
  }

  private async dispatchVerification(registration: any): Promise<void> {
    const url = process.env.GIGA_SYNC_REGISTRATION_URL;
    const token = process.env.GIGA_SYNC_AUTH_TOKEN;

    if (!url) {
      await this.markDispatchFailure(
        registration.id,
        'GIGA_SYNC_REGISTRATION_URL is not configured',
      );
      return;
    }

    try {
      const requestedAt = new Date();
      const payload = this.toVerificationPayload(
        registration,
        requestedAt,
      );

      await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        }),
      );

      await this.prisma.school_new_registration.update({
        where: {
          id: registration.id,
        },
        data: {
          verification_status: 'DISPATCHED',
          verification_requested_at: requestedAt,
          verification_error: null,
          modified: requestedAt,
        },
      });
    } catch (error) {
      await this.markDispatchFailure(
        registration.id,
        this.extractErrorMessage(error),
      );
    }
  }

  private async markDispatchFailure(
    registrationId: bigint,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.school_new_registration.update({
      where: {
        id: registrationId,
      },
      data: {
        verification_status: 'FAILED_TO_DISPATCH',
        verification_error: errorMessage,
        modified: new Date(),
      },
    });
  }

  private toVerificationPayload(
    registration: any,
    modifiedAt: Date,
  ): SchoolRegistrationVerificationPayloadDto {
    return {
      registration_id: registration.id.toString(),
      school_id: registration.school_id,
      school_name: registration.school_name,
      country_iso3_code: registration.country_iso3_code,
      latitude: registration.latitude,
      longitude: registration.longitude,
      address: registration.address,
      education_level: registration.education_level,
      contact_name: registration.contact_name,
      contact_email: registration.contact_email,
      giga_id_school: registration.giga_id_school,
      created_at: (registration.created_at ?? registration.created).toISOString(),
      modified_at: modifiedAt.toISOString(),
    };
  }

  private extractErrorMessage(error: any): string {
    if (error?.response?.data) {
      return JSON.stringify(error.response.data);
    }

    if (error?.message) {
      return error.message;
    }

    return 'Failed to dispatch registration to giga_sync';
  }

  private normalizeGigaId(gigaId: string): string {
    return gigaId.toLowerCase().trim();
  }

  private normalizeSchoolId(schoolId: string): string {
    return schoolId.trim();
  }

  private async ensureSchoolIdIsAvailable(schoolId: string): Promise<void> {
    const existingSchool = await this.prisma.school.findFirst({
      where: {
        external_id: {
          equals: schoolId,
          mode: 'insensitive',
        },
        deleted: null,
      },
      select: {
        id: true,
      },
    });

    if (existingSchool) {
      throw new ConflictException(
        `school_id '${schoolId}' already exists in school table`,
      );
    }

    const existingRegistration =
      await this.prisma.school_new_registration.findFirst({
        where: {
          school_id: {
            equals: schoolId,
            mode: 'insensitive',
          },
          deleted: null,
        },
        select: {
          id: true,
        },
      });

    if (existingRegistration) {
      throw new ConflictException(
        `school_id '${schoolId}' already exists.`,
      );
    }
  }

  private toResponseDto(registration: any): SchoolRegistrationResponseDto {
    return {
      giga_id_school: registration.giga_id_school,
      verification_status: registration.verification_status ?? 'PENDING',
    };
  }
}
