import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Privacy — Coconut', description: 'Plain-language privacy note for the Coconut hackathon demo.' };

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
