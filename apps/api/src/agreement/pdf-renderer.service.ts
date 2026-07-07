import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Browser, chromium } from 'playwright-core';

/**
 * Headless-Chromium PDF renderer (spec §7.3). The browser is launched lazily
 * on the first export and reused across requests (launch costs ~0.5 s);
 * rendering happens in a throwaway OFFLINE context — the input HTML is our
 * own template with no external assets, and offline mode guarantees no
 * network egress even if a stored payload tried to reference one (SEC-7).
 *
 * Executable resolution: PSA_CHROMIUM_PATH env override (dev machines with a
 * preinstalled browser) or playwright-core's own registry browser, installed
 * into the api image at build time.
 */
@Injectable()
export class PdfRendererService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly config: ConfigService) {}

  private launch(): Promise<Browser> {
    if (!this.browserPromise) {
      const executablePath = this.config.get<string>('PSA_CHROMIUM_PATH');
      this.logger.log(
        `Launching headless Chromium for PDF export${executablePath ? ` (${executablePath})` : ''}`,
      );
      this.browserPromise = chromium
        .launch({
          executablePath,
          // Containerized headless rendering: the Podman/Docker container is
          // the isolation boundary; /dev/shm in containers is tiny.
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        })
        .catch((error: unknown) => {
          // A failed launch must not poison future attempts.
          this.browserPromise = null;
          throw error;
        });
    }
    return this.browserPromise;
  }

  async renderPdf(html: string): Promise<Buffer> {
    const browser = await this.launch();
    const context = await browser.newContext({ offline: true });
    try {
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      return await page.pdf({
        format: 'A4',
        margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '18mm' },
        printBackground: true,
      });
    } finally {
      await context.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise.catch(() => null);
      await browser?.close();
      this.browserPromise = null;
    }
  }
}
