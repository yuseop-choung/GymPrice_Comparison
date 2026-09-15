import { fireEvent, render } from "@testing-library/react-native";
import { PriceForm } from "./PriceForm";

describe("PriceForm", () => {
  it("초기값을 입력에 채운다", async () => {
    const { getByDisplayValue } = await render(
      <PriceForm
        initial={{ label: "1개월", price: 60000, memo: "메모입니다" }}
        submitLabel="수정하기"
        isLoading={false}
        error={null}
        onSubmit={jest.fn()}
      />
    );

    expect(getByDisplayValue("1개월")).toBeTruthy();
    expect(getByDisplayValue("60000")).toBeTruthy();
    expect(getByDisplayValue("메모입니다")).toBeTruthy();
  });

  it("값을 바꾸고 제출하면 onSubmit에 새 값이 전달된다", async () => {
    const onSubmit = jest.fn();
    const { getByDisplayValue, getByText } = await render(
      <PriceForm
        initial={{ label: "1개월", price: 60000, memo: null }}
        submitLabel="수정하기"
        isLoading={false}
        error={null}
        onSubmit={onSubmit}
      />
    );

    await fireEvent.changeText(getByDisplayValue("60000"), "50000");
    await fireEvent.press(getByText("수정하기"));

    expect(onSubmit).toHaveBeenCalledWith({
      label: "1개월",
      price: 50000,
      memo: null,
    });
  });

  it("onDelete가 있으면 삭제하기를 눌러 호출할 수 있다", async () => {
    const onDelete = jest.fn();
    const { getByText } = await render(
      <PriceForm
        initial={{ label: "1개월", price: 60000, memo: null }}
        submitLabel="수정하기"
        isLoading={false}
        error={null}
        onSubmit={jest.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.press(getByText("삭제하기"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
