import { BadRequestException } from '@nestjs/common';
import { validateContact } from '../../../shared/contactValidation.cjs';

export class ContactDto {
  name: string;
  email: string;
  message: string;

  static from(body: unknown): ContactDto {
    const { value, errors } = validateContact(body);
    if (Object.keys(errors).length)
      throw new BadRequestException({
        message: 'Data pesan tidak valid.',
        errors,
      });
    return Object.assign(new ContactDto(), value);
  }
}
