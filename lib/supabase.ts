import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 초기화
 *
 * ⚠️ 중요: supabase 클라이언트는 반드시 이 파일에서만 생성한다.
 *          다른 파일에서 createClient를 호출하지 말고, 이 파일의 `supabase`를 import 해서 사용한다.
 *          (CLAUDE.md 규칙 — API 통신은 /lib, /lib/api 에서만 처리)
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 환경변수 누락 시 조기에 에러를 발생시켜 디버깅을 쉽게 한다.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase 환경변수가 없습니다. EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // React Native 환경에서 세션을 AsyncStorage에 저장한다.
    storage: AsyncStorage,
    autoRefreshToken: true, // 토큰 자동 갱신
    persistSession: true, // 세션 유지 (앱 재실행 시 로그인 유지)
    detectSessionInUrl: false, // RN에는 URL 세션 감지가 불필요
  },
});
