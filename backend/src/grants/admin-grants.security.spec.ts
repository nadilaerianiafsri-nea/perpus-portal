import { AdminGrantsService } from './admin-grants.service';
import type { PrismaService } from '../prisma/prisma.service';

const body = { donorName: "O'Connor & R&D", receivedAt: '2026-10-12', status: 'SUDAH_DIKATALOGKAN', note: 'Hukum & HAM', items: [{ title: 'Hukum & HAM', quantity: 1 }] };
// Validation must stop invalid requests before any database access.
const service = new AdminGrantsService({} as PrismaService);
describe('Grant input security', () => {
  it.each([
    { ...body, donorName: '<b>Donor</b>' },
    { ...body, note: '<script>alert(1)</script>' },
    { ...body, items: [{ title: '<img src=x>', quantity: 1 }] },
  ])('rejects HTML in grant text', async (input) => {
    await expect(service.create(input)).rejects.toThrow('Input tidak boleh mengandung HTML.');
  });
  it('rejects nested unknown keys', async () => {
    await expect(service.create({ ...body, items: [{ ...body.items[0], grantId: 1 }] })).rejects.toThrow('Field item hibah tidak diizinkan.');
  });
  it.each([true, '1', [1], { valueOf: () => 1 }])('rejects quantity coercion', async (quantity) => {
    await expect(service.create({ ...body, items: [{ title: 'Hukum', quantity }] })).rejects.toThrow('Jumlah buku ke-1 tidak valid.');
  });
  it('rejects HTML search before querying', async () => {
    await expect(service.list({ search: '<b>donor</b>' })).rejects.toThrow('Input tidak boleh mengandung HTML.');
  });
  it('rejects oversized IDs before querying', async () => {
    await expect(service.detail('2147483648')).rejects.toThrow('ID hibah tidak valid.');
  });
});

