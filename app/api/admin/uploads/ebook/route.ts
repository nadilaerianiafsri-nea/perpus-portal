import { adminEBookUploadProxy } from '@/admin/ebookUploadProxy';

export async function POST(request: Request) {
  return adminEBookUploadProxy(request);
}
