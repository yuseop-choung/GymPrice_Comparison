import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser, signOut as apiSignOut } from "../lib/api/auth";
import type { User } from "../types";
import { useAuthStore } from "./authStore";

jest.mock("../lib/api/auth", () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

const getCurrentUserMock = getCurrentUser as jest.Mock;
const apiSignOutMock = apiSignOut as jest.Mock;

const KEEP_LOGGED_IN_KEY = "keep_logged_in";

const USER: User = {
  uid: "user-1",
  email: "tester@example.com",
  nickname: "테스터",
  is_admin: false,
  is_suspended: false,
  created_at: "2026-01-01T00:00:00Z",
};

describe("authStore", () => {
  beforeEach(async () => {
    getCurrentUserMock.mockReset();
    apiSignOutMock.mockReset().mockResolvedValue(undefined);
    await AsyncStorage.clear();
    useAuthStore.setState({ user: null, isInitialized: false });
  });

  describe("setUser", () => {
    it("keepLoggedIn=true로 로그인하면 선택을 기기에 저장한다", async () => {
      useAuthStore.getState().setUser(USER, true);

      expect(useAuthStore.getState().user).toEqual(USER);
      await new Promise((r) => setTimeout(r, 0)); // AsyncStorage.setItem은 fire-and-forget
      expect(await AsyncStorage.getItem(KEEP_LOGGED_IN_KEY)).toBe("true");
    });

    it("keepLoggedIn=false로 로그인하면 그 선택도 그대로 저장한다", async () => {
      useAuthStore.getState().setUser(USER, false);

      await new Promise((r) => setTimeout(r, 0));
      expect(await AsyncStorage.getItem(KEEP_LOGGED_IN_KEY)).toBe("false");
    });

    it("keepLoggedIn을 생략하면(세션 복구 등) 저장된 값을 건드리지 않는다", async () => {
      await AsyncStorage.setItem(KEEP_LOGGED_IN_KEY, "false");

      useAuthStore.getState().setUser(USER);

      await new Promise((r) => setTimeout(r, 0));
      expect(await AsyncStorage.getItem(KEEP_LOGGED_IN_KEY)).toBe("false");
    });
  });

  describe("initialize", () => {
    it("저장된 값이 없으면(기존 유저) 기존처럼 세션을 복구한다", async () => {
      getCurrentUserMock.mockResolvedValue(USER);

      await useAuthStore.getState().initialize();

      expect(apiSignOutMock).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).toEqual(USER);
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it("로그인 상태 유지를 선택했으면 세션을 복구한다", async () => {
      await AsyncStorage.setItem(KEEP_LOGGED_IN_KEY, "true");
      getCurrentUserMock.mockResolvedValue(USER);

      await useAuthStore.getState().initialize();

      expect(apiSignOutMock).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).toEqual(USER);
    });

    it("로그인 상태 유지를 선택하지 않았으면 기기 세션을 지우고 비로그인 처리한다", async () => {
      await AsyncStorage.setItem(KEEP_LOGGED_IN_KEY, "false");

      await useAuthStore.getState().initialize();

      expect(apiSignOutMock).toHaveBeenCalledWith("local");
      expect(getCurrentUserMock).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it("세션 복구 중 에러가 나도 앱 진입은 가능하도록 비로그인 처리한다", async () => {
      getCurrentUserMock.mockRejectedValue(new Error("network error"));

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });

  describe("signOut", () => {
    it("로그아웃하면 user를 null로 바꾼다", async () => {
      useAuthStore.setState({ user: USER });

      await useAuthStore.getState().signOut();

      expect(apiSignOutMock).toHaveBeenCalledWith();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
