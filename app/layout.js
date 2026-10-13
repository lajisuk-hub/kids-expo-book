import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://kids-expo-book.vercel.app"),
  title: "우리 어린이집 온라인 전시회",
  description: "동화책·체험·그림·음악, 네 가지 전시를 휴대폰으로 즐기는 어린이집 온라인 전시회예요. 동화책을 보고 소감을 남겨요.",
  openGraph: {
    title: "우리 어린이집 온라인 전시회",
    description: "동화책·체험·그림·음악, 네 가지 전시를 휴대폰으로 즐겨요.",
    images: ["/og.jpg"],
  },
};

export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ff6b6b" };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
