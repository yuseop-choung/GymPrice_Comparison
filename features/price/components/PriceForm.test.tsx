import { fireEvent, render } from "@testing-library/react-native";
import { PriceForm } from "./PriceForm";

describe("PriceForm", () => {
  it("입력값을 숫자로 변환하고 빈 칸은 null로 onSubmit에 전달한다", async () => {
    const onSubmit = jest.fn();
    const { getByPlaceholderText, getByText } = await render(
      <PriceForm
        submitLabel="등록하기"
        isLoading={false}
        error={null}
        onSubmit={onSubmit}
      />
    );

    await fireEvent.changeText(getByPlaceholderText("예: 50000"), "50000");
    await fireEvent.press(getByText("등록하기"));

    expect(onSubmit).toHaveBeenCalledWith({
      price_1m: 50000,
      price_3m: null,
      price_6m: null,
      price_12m: null,
      memo: null,
    });
  });

  it("초기값(initial)을 입력에 채운다", async () => {
    const onSubmit = jest.fn();
    const { getByDisplayValue } = await render(
      <PriceForm
        submitLabel="수정하기"
        isLoading={false}
        error={null}
        initial={{
          price_1m: 60000,
          price_3m: null,
          price_6m: null,
          price_12m: null,
          memo: "메모입니다",
        }}
        onSubmit={onSubmit}
      />
    );

    expect(getByDisplayValue("60000")).toBeTruthy();
    expect(getByDisplayValue("메모입니다")).toBeTruthy();
  });
});
