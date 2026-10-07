import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bookInput, positiveId } from './member.validation';

@Injectable()
export class ActiveBookGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      body?: unknown;
      params?: { bookId?: unknown };
    }>();

    const bookId =
      request.params?.bookId !== undefined
        ? positiveId(request.params.bookId)
        : bookInput(request.body);

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { type: true, isActive: true },
    });

    if (book && !book.isActive) {
      throw new ConflictException(
        book.type === 'EBOOK'
          ? 'E-Book sedang dinonaktifkan dan tidak dapat diakses.'
          : 'Buku sedang dinonaktifkan dan tidak dapat direservasi.',
      );
    }

    return true;
  }
}
