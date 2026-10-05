import PasswordRecovery from '@/auth/PasswordRecovery';
export const metadata = { referrer: 'no-referrer' as const, robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const value = (await searchParams).token;
  return <PasswordRecovery token={typeof value === 'string' ? value : ''} reset />;
}
