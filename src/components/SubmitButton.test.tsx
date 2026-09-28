// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SubmitButton } from "./SubmitButton";

afterEach(cleanup);

function renderForm(action: (data: FormData) => Promise<void>) {
  render(
    <form action={action}>
      <SubmitButton pendingLabel="Creating…">Create household</SubmitButton>
    </form>,
  );
  return screen.getByRole("button");
}

describe("SubmitButton", () => {
  it("is enabled before submitting", () => {
    const button = renderForm(async () => {});
    expect(button).toHaveProperty("disabled", false);
    expect(button.textContent).toBe("Create household");
  });

  it("disables itself and shows the pending label while the action runs", async () => {
    let finish = () => {};
    const button = renderForm(() => new Promise<void>((resolve) => (finish = resolve)));

    await act(async () => fireEvent.click(button));
    expect(button).toHaveProperty("disabled", true);
    expect(button.textContent).toBe("Creating…");

    await act(async () => finish());
    expect(button).toHaveProperty("disabled", false);
    expect(button.textContent).toBe("Create household");
  });
});
