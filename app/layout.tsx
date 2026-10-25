import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Study Command Center · Alfaisal M1-A',description:'Adaptive reviews, practice MCQs and a personal daily study plan.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
