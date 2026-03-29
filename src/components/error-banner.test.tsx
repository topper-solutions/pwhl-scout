import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "./error-banner";

describe("ErrorBanner", () => {
  it("renders the provided message", () => {
    render(<ErrorBanner message="Something failed" />);
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("renders the help text", () => {
    render(<ErrorBanner message="Error" />);
    expect(
      screen.getByText(/try refreshing the page/i)
    ).toBeInTheDocument();
  });
});
