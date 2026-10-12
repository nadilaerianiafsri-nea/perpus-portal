import { BadRequestException } from '@nestjs/common';
import { textInputError } from '../../../shared/inputValidation.cjs';

export function authObject(body: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Data harus berupa object.');
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowed.includes(key)))
    throw new BadRequestException('Field tidak dikenal.');
  return input;
}

export function authEmail(value: unknown): string {
  const error = textInputError(value, { required: true, max: 191 });
  if (error) throw new BadRequestException(error);
  const email = (value as string).trim().toLowerCase();
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(email))
    throw new BadRequestException('Email tidak valid.');
  return email;
}

export function authToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 4096 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}
