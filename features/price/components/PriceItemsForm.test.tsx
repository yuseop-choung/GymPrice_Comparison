import { fireEvent, render } from "@testing-library/react-native";
import { PriceItemsForm } from "./PriceItemsForm";

describe("PriceItemsForm", () => {
  it("가격을 입력한 항목만 onSubmit으로 전달한다", async () => {
    const onSubmit = jest.fn();
    const { getAllByPlaceholderText, getByText } = await render(
      <PriceItemsForm
        submitLabel="등록하기"
        isLoading={false}
        error={null}
        onSubmit={onSubmit}
      />
    );

    // 기본 4항목(1/3/6/12개월) 중 첫 번째(1개월)만 입력
    const priceInputs = getAllByPlaceholderText("가격(원)");
    await fireEvent.changeText(priceInputs[0], "50000");

    await fireEvent.press(getByText("등록하기"));

    expect(onSubmit).toHaveBeenCalledWith([
      { label: "1개월", price: 50000, memo: null },
    ]);
  });

  it("아무 가격도 입력하지 않으면 빈 배열로 onSubmit이 호출된다 (검증은 호출부 책임)", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await render(
      <PriceItemsForm
        submitLabel="등록하기"
        isLoading={false}
        error={null}
        onSubmit={onSubmit}
      />
    );

    await fireEvent.press(getByText("등록하기"));
    expect(onSubmit).toHaveBeenCalledWith([]);
  });

  it('"+ 가격 항목 추가"로 PT 횟수권 같은 커스텀 항목을 추가해 등록할 수 있다', async () => {
    const onSubmit = jest.fn();
    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      await render(
        <PriceItemsForm
          submitLabel="등록하기"
          isLoading={false}
          error={null}
          onSubmit={onSubmit}
        />
      );

    await fireEvent.press(getByText("+ 가격 항목 추가"));
    await fireEvent.changeText(getByPlaceholderText("예: PT 10회"), "PT 10회");

    const priceInputs = getAllByPlaceholderText("가격(원)");
    await fireEvent.changeText(priceInputs[priceInputs.length - 1], "500000");

    await fireEvent.press(getByText("등록하기"));

    expect(onSubmit).toHaveBeenCalledWith([
      { label: "PT 10회", price: 500000, memo: null },
    ]);
  });

  it("메모를 입력하면 등록되는 모든 항목에 같은 메모가 붙는다", async () => {
    const onSubmit = jest.fn();
    const { getAllByPlaceholderText, getByPlaceholderText, getByText } =
      await render(
        <PriceItemsForm
          submitLabel="등록하기"
          isLoading={false}
          error={null}
          onSubmit={onSubmit}
        />
      );

    const priceInputs = getAllByPlaceholderText("가격(원)");
    await fireEvent.changeText(priceInputs[0], "50000"); // 1개월
    await fireEvent.changeText(priceInputs[1], "130000"); // 3개월
    await fireEvent.changeText(getByPlaceholderText("추가 정보 (선택)"), "학생 할인");

    await fireEvent.press(getByText("등록하기"));

    expect(onSubmit).toHaveBeenCalledWith([
      { label: "1개월", price: 50000, memo: "학생 할인" },
      { label: "3개월", price: 130000, memo: "학생 할인" },
    ]);
  });
});
