import { redirect } from 'next/navigation';

export default function DoctorAiRedirectPage() {
    redirect('/dashboard/doctor/cases');
}