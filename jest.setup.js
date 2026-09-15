// 전역 jest 셋업
// - AsyncStorage는 네이티브 모듈이라 테스트 환경(Node)에서 그대로 쓰면
//   "NativeModule: AsyncStorage is null" 에러가 난다. 공식 목으로 대체한다.
//   (themeStore/onboardingStore 등 AsyncStorage를 쓰는 store를 거치는
//   컴포넌트가 늘면서 개별 테스트 파일마다 mock하기보다 여기서 한 번에 처리한다.)
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
