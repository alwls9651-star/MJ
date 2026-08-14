import type { Metadata } from "next"; import "./globals.css";
export const metadata:Metadata={title:{default:"방과후 신청",template:"%s | 방과후 신청"},description:"학교 방과후학교 수강신청 서비스"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
