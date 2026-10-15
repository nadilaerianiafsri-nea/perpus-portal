import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';

const multipartUploadPaths = new Set([
  '/admin/uploads/cover',
  '/admin/uploads/ebook',
]);

export function configureHttpSecurity(
  app: NestExpressApplication,
  origins: string[],
) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      strictTransportSecurity:
        process.env.NODE_ENV === 'production' ? undefined : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xFrameOptions: { action: 'sameorigin' },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (
        (origin && !origins.includes(origin)) ||
        req.headers['sec-fetch-site'] === 'cross-site'
      ) {
        res.status(403).json({ message: 'Permintaan tidak diizinkan.' });
        return;
      }

      const contentType = req.headers['content-type']
        ?.split(';')[0]
        .trim()
        .toLowerCase();
      const normalizedPath = req.path.toLowerCase().replace(/\/+$/, '');
      const allowedMultipart =
        contentType === 'multipart/form-data' &&
        multipartUploadPaths.has(normalizedPath);

      if (
        contentType &&
        contentType !== 'application/json' &&
        !allowedMultipart
      ) {
        res.status(415).json({ message: 'Format permintaan tidak valid.' });
        return;
      }
    }
    next();
  });

  app.useBodyParser('json', { limit: '64kb', strict: true });

  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      const failure = error as { type?: string; status?: number };
      if (
        failure?.type &&
        [
          'entity.too.large',
          'entity.parse.failed',
          'encoding.unsupported',
          'charset.unsupported',
          'request.aborted',
          'request.size.invalid',
        ].includes(failure.type)
      ) {
        res
          .status(failure.status === 413 ? 413 : 400)
          .json({
            message:
              failure.status === 413
                ? 'Data permintaan terlalu panjang.'
                : 'Data permintaan tidak valid.',
          });
        return;
      }
      next(error);
    },
  );
}
