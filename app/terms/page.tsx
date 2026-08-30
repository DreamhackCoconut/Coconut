import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Terms — Coconut', description: 'Plain-language terms for the Coconut hackathon demo.' };

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
