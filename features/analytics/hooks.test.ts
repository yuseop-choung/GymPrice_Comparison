import { renderHook } from "@testing-library/react-native";
import { trackAppOpen, trackGymView } from "../../lib/api/analytics";
import { useTrackAppOpen, useTrackGymView } from "./hooks";

// api 모듈을 목으로 대체 (실제 supabase 로드 방지)
jest.mock("../../lib/api/analytics", () => ({
  trackAppOpen: jest.fn().mockResolvedValue(undefined),
  trackGymView: jest.fn().mockResolvedValue(undefined),
}));

const trackAppOpenMock = trackAppOpen as jest.Mock;
const trackGymViewMock = trackGymView as jest.Mock;

interface AppOpenProps {
  userId: string | undefined;
}
interface GymViewProps {
  userId: string | undefined;
  gymId: string;
}

describe("useTrackAppOpen", () => {
  beforeEach(() => trackAppOpenMock.mockClear());

  it("로그인 유저가 없으면 기록하지 않는다", async () => {
    await renderHook(({ userId }: AppOpenProps) => useTrackAppOpen(userId), {
      initialProps: { userId: undefined },
    });
    expect(trackAppOpenMock).not.toHaveBeenCalled();
  });

  it("유저가 확인되면 한 번 기록한다", async () => {
    const { rerender } = await renderHook(
      ({ userId }: AppOpenProps) => useTrackAppOpen(userId),
      { initialProps: { userId: undefined } }
    );
    await rerender({ userId: "user-1" });

    expect(trackAppOpenMock).toHaveBeenCalledTimes(1);
    expect(trackAppOpenMock).toHaveBeenCalledWith("user-1");
  });

  it("이미 기록한 뒤에는 유저가 바뀌어도 다시 기록하지 않는다", async () => {
    const { rerender } = await renderHook(
      ({ userId }: AppOpenProps) => useTrackAppOpen(userId),
      { initialProps: { userId: "user-1" } }
    );
    expect(trackAppOpenMock).toHaveBeenCalledTimes(1);

    await rerender({ userId: "user-2" });
    expect(trackAppOpenMock).toHaveBeenCalledTimes(1);
  });
});

describe("useTrackGymView", () => {
  beforeEach(() => trackGymViewMock.mockClear());

  it("유저나 헬스장 id가 없으면 기록하지 않는다", async () => {
    await renderHook(
      ({ userId, gymId }: GymViewProps) => useTrackGymView(userId, gymId),
      { initialProps: { userId: undefined, gymId: "" } }
    );
    expect(trackGymViewMock).not.toHaveBeenCalled();
  });

  it("헬스장 상세를 보면 기록한다", async () => {
    await renderHook(
      ({ userId, gymId }: GymViewProps) => useTrackGymView(userId, gymId),
      { initialProps: { userId: "user-1", gymId: "gym-1" } }
    );
    expect(trackGymViewMock).toHaveBeenCalledWith("user-1", "gym-1");
  });

  it("다른 헬스장으로 이동하면 다시 기록한다", async () => {
    const { rerender } = await renderHook(
      ({ userId, gymId }: GymViewProps) => useTrackGymView(userId, gymId),
      { initialProps: { userId: "user-1", gymId: "gym-1" } }
    );
    expect(trackGymViewMock).toHaveBeenCalledTimes(1);

    await rerender({ userId: "user-1", gymId: "gym-2" });
    expect(trackGymViewMock).toHaveBeenCalledTimes(2);
    expect(trackGymViewMock).toHaveBeenLastCalledWith("user-1", "gym-2");
  });

  it("같은 헬스장이면 다시 기록하지 않는다", async () => {
    const { rerender } = await renderHook(
      ({ userId, gymId }: GymViewProps) => useTrackGymView(userId, gymId),
      { initialProps: { userId: "user-1", gymId: "gym-1" } }
    );
    expect(trackGymViewMock).toHaveBeenCalledTimes(1);

    await rerender({ userId: "user-1", gymId: "gym-1" });
    expect(trackGymViewMock).toHaveBeenCalledTimes(1);
  });
});
