import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppToastViewport } from "./app-toast-viewport";

describe("<AppToastViewport />", () => {
  it("renders toast feedback in a viewport above overlay-level surfaces", () => {
    render(
      <>
        <div data-testid="overlay" className="fixed inset-0 z-50" />
        <AppToastViewport
          toasts={[
            {
              id: "toast-1",
              title: "Saved",
              description: "Room settings were saved.",
            },
          ]}
        />
      </>,
    );

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByTestId("app-toast-viewport").className).toContain("z-[70]");
    expect(screen.getByTestId("overlay").className).toContain("z-50");
  });
});
