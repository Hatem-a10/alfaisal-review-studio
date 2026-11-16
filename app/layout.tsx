import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Review Studio',applicationName:'Review Studio',appleWebApp:{title:'Review Studio'},openGraph:{title:'Review Studio'},description:'Adaptive reviews, practice MCQs and a personal daily study plan.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
