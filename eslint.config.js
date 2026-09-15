// ESLint 설정 (flat config, ESLint 9+)
// - Expo 공식 프리셋(eslint-config-expo)을 기반으로 한다.
// - supabase/functions는 Deno 런타임 전용 코드(원격 URL import, Deno.* 전역)라
//   Node 기반 ESLint 파서로는 제대로 lint할 수 없어 제외한다(tsconfig.json이
//   같은 이유로 이 폴더를 타입 검사에서 제외하는 것과 동일한 이유).
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = [
  ...expoConfig,
  {
    // .expo/는 Expo CLI가 매 실행마다 자동 생성하는 디렉터리라 lint 대상이 아니다.
    ignores: ["dist/*", ".expo/**", "supabase/functions/**", "admin/**"],
  },
  {
    // CLAUDE.md 규칙: any 사용 금지. eslint-config-expo는 이 규칙을 기본으로
    // 켜두지 않아 여기서 명시적으로 켠다(플러그인은 위 typescript 설정에서
    // 이미 .ts/.tsx 파일 대상으로 등록돼 있어, 같은 파일 패턴에만 규칙을 추가한다).
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // jest.config.js / jest.setup.js 는 Jest(Node) 환경에서 실행되는 설정 파일이다.
    files: ["jest.config.js", "jest.setup.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
];
