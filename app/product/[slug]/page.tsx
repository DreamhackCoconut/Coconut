import { CoconutApp } from '@/components/coconut-app';

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <CoconutApp initialProductSlug={params.slug} />;
}
