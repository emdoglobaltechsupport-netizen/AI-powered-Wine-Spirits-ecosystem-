import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <h1>Not found</h1>
      <p className="notice notice--error">
        This view does not exist. The portal has no patient-record or clinical-approval pages.
      </p>
      <Link href="/">Return to overview</Link>
    </main>
  );
}
