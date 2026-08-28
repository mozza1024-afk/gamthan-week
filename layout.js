import './globals.css';

export const metadata = {
  metadataBase: new URL('https://gamthan-week.vercel.app'),
  title: '감탄위크 마라톤–나의 감탄일기',
  description: '7·14·21·28일, 오늘의 작은 탄소중립 실천을 기록하고 함께 완주해요.',
  openGraph: {
    title: '감탄위크 마라톤 | 나의 감탄일기',
    description: '7·14·21·28일, 오늘의 작은 탄소중립 실천을 기록하고 함께 완주해요.',
    type: 'website',
    siteName: '온기동행 × 명륜종합사회복지관',
    images: ['https://raw.githubusercontent.com/mozza1024-afk/gamthan-week/main/gamthan-week-v4/public/assets/share-preview.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
