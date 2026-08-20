import { redirect } from 'next/navigation';

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  redirect(`/${lang}/docs`);
}
