import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ZodBody } from '../common/zod-validation.pipe';
import { MAX_TEST_IMPORT_BYTES, type UpdateZonesDto, updateZonesSchema } from './dto';
import { TestImportService, type UploadedTestFile } from './test-import.service';

@Roles(Role.architect, Role.admin)
@Controller('partnerships/:partnershipId/test-imports')
export class TestImportController {
  constructor(private readonly imports: TestImportService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('partnershipId') partnershipId: string) {
    return this.imports.list(user, partnershipId);
  }

  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_TEST_IMPORT_BYTES, files: 1 } }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @UploadedFile() file?: UploadedTestFile,
  ) {
    if (!file) {
      throw new BadRequestException('A "file" form field is required');
    }
    return this.imports.create(user, partnershipId, file);
  }

  @Patch(':importId/zones')
  updateZones(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('importId') importId: string,
    @Body(new ZodBody(updateZonesSchema)) dto: UpdateZonesDto,
  ) {
    return this.imports.updateZones(user, partnershipId, importId, dto);
  }

  @Delete(':importId')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('partnershipId') partnershipId: string,
    @Param('importId') importId: string,
  ) {
    await this.imports.remove(user, partnershipId, importId);
  }
}
