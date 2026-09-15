import { fireEvent, render } from "@testing-library/react-native";
import type { GymPrice } from "../../../types";
import { useDetailPriceAccess } from "../../price/hooks";
import { GymPriceSection } from "./GymPriceSection";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../../price/hooks", () => ({
  useDetailPriceAccess: jest.fn(),
}));

const useDetailPriceAccessMock = useDetailPriceAccess as jest.Mock;

function makePrice(label: string, price: number, userId = `u-${label}-${price}`): GymPrice {
  return {
    id: `p-${label}-${price}`,
    gym_id: "g1",
    user_id: userId,
    label,
    price,
    memo: null,
    status: "approved",
    created_at: "2026-01-01T00:00:00Z",
  };
}

describe("GymPriceSection", () => {
  const requestAccessMock = jest.fn();
  const dismissLimitModalMock = jest.fn();

  beforeEach(() => {
    mockPush.mockClear();
    requestAccessMock.mockReset();
    dismissLimitModalMock.mockClear();
    useDetailPriceAccessMock.mockReturnValue({
      isChecking: false,
      limitReached: false,
      requestAccess: requestAccessMock,
      dismissLimitModal: dismissLimitModalMock,
    });
  });

  it("승인된 가격이 없으면 안내 문구만 보여준다", async () => {
    const { getByText, queryByText } = await render(
      <GymPriceSection gymId="g1" prices={[]} />
    );
    expect(getByText("아직 승인된 가격이 없어요. 첫 가격을 등록해보세요!")).toBeTruthy();
    expect(queryByText("다른 기간 가격 보기 ▼")).toBeNull();
  });

  it("1개월 최저가는 무료로 바로 보이고, 다른 기간은 토글 전엔 안 보인다", async () => {
    const { getByText, queryByText } = await render(
      <GymPriceSection
        gymId="g1"
        prices={[makePrice("1개월", 50000), makePrice("3개월", 130000)]}
      />
    );
    expect(getByText("1개월 최저가")).toBeTruthy();
    expect(getByText("50,000원")).toBeTruthy();
    expect(queryByText("130,000원")).toBeNull();
  });

  it("\"다른 기간 가격 보기\"를 누르면 접근 권한을 확인하고, 허용되면 상세를 펼친다", async () => {
    requestAccessMock.mockResolvedValue(true);
    const { getByText, findAllByText } = await render(
      <GymPriceSection
        gymId="g1"
        prices={[
          makePrice("1개월", 50000),
          makePrice("3개월", 120000),
          makePrice("3개월", 140000),
        ]}
      />
    );

    await fireEvent.press(getByText("다른 기간 가격 보기 ▼"));

    expect(requestAccessMock).toHaveBeenCalledTimes(1);
    // 3개월 요약(가격 요약 표)과 개별 등록 내역(상세 목록) 둘 다 펼쳐진다.
    expect((await findAllByText("3개월")).length).toBeGreaterThanOrEqual(2);
    expect(getByText("상세 내역 숨기기 ▲")).toBeTruthy();
  });

  it("접근이 거부되면(한도 초과) 상세를 펼치지 않는다", async () => {
    requestAccessMock.mockResolvedValue(false);
    const { getByText, queryByText } = await render(
      <GymPriceSection
        gymId="g1"
        prices={[makePrice("1개월", 50000), makePrice("3개월", 130000)]}
      />
    );

    await fireEvent.press(getByText("다른 기간 가격 보기 ▼"));

    expect(requestAccessMock).toHaveBeenCalledTimes(1);
    expect(queryByText("130,000원")).toBeNull();
    expect(getByText("다른 기간 가격 보기 ▼")).toBeTruthy(); // 여전히 접힌 상태
  });

  it("한도 초과 모달에서 등록하러 가기를 누르면 이 헬스장 가격 등록 화면으로 이동한다", async () => {
    useDetailPriceAccessMock.mockReturnValue({
      isChecking: false,
      limitReached: true,
      requestAccess: requestAccessMock,
      dismissLimitModal: dismissLimitModalMock,
    });
    const { getByText } = await render(
      <GymPriceSection gymId="g1" prices={[makePrice("1개월", 50000)]} />
    );

    await fireEvent.press(getByText("이 헬스장 가격 등록하러 가기"));

    expect(dismissLimitModalMock).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/gym/g1/price-submit");
  });
});
