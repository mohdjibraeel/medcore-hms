import Link from 'next/link';

export default function ReceptionistDashboardPage() {
  return (
    <div className="max-w-md space-y-3">
      <h1 className="text-lg font-semibold text-zinc-900">Receptionist Desk</h1>
      <Link href="/dashboard/receptionist/register-patient" className="block rounded-md border border-zinc-200 bg-white p-4 hover:bg-zinc-50">
        Register New Patient
      </Link>
      <Link href="/dashboard/receptionist/book-for-patient" className="block rounded-md border border-zinc-200 bg-white p-4 hover:bg-zinc-50">
        Book Appointment for Patient
      </Link>
    </div>
  );
}