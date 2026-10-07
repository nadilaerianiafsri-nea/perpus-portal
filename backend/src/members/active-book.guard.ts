import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bookInput } from './member.validation';

@Injectable()
export class ActiveBookGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ body?: unknown }>();
    const bookId = bookInput(request.body);
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { type: true, isActive: true },
    });

    if (book?.type === 'FISIK' && !book.isActive) {
      throw new ConflictException(
        'Buku sedang dinonaktifkan dan tidak dapat direservasi.',
      );
    }

    return true;
  }
}
