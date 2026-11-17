import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRIPLOG | 나의 여행 지도',
  description: '장소와 여행을 기록하고 다른 학생의 여행 팁을 살펴보세요.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
