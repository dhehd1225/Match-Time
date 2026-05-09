
  import { createRoot } from "react-dom/client";
  import { inject } from "@vercel/analytics";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Vercel Analytics (페이지뷰, 방문자 자동 추적)
  inject();

  // Kakao SDK 초기화
  declare global {
    interface Window {
      Kakao: any;
    }
  }

  const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY || '6b153d32f9af37375d6ff7e1d1164ef2';
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(kakaoKey);
  }

  createRoot(document.getElementById("root")!).render(<App />);
