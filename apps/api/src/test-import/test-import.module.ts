import { Module } from '@nestjs/common';

import { TestImportController } from './test-import.controller';
import { TestImportService } from './test-import.service';

@Module({
  controllers: [TestImportController],
  providers: [TestImportService],
})
export class TestImportModule {}
