import { LoginForm } from '../../components/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main>
      <LoginForm reason={reason === 'expired' ? 'AUTH_REQUIRED' : undefined} />
    </main>
  );
}
