import { adminCoverUploadProxy } from '@/admin/coverUploadProxy';

export async function POST(request: Request) {
  return adminCoverUploadProxy(request);
}
