import { render, screen, act } from "@testing-library/react";
import { DataFreshness } from "./data-freshness";

describe("DataFreshness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders "Updated just now" when renderedAt is recent', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(<DataFreshness renderedAt={now} revalidateSeconds={60} />);
    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
  });

  it("does not show stale warning when within threshold", () => {
    const now = Date.now();
    vi.setSystemTime(now + 60_000); // 1 min later, threshold is 2*60=120s
    render(<DataFreshness renderedAt={now} revalidateSeconds={60} />);
    expect(screen.queryByText(/may be outdated/)).not.toBeInTheDocument();
  });

  it("shows stale warning when renderedAt exceeds 2x revalidateSeconds", () => {
    const now = Date.now();
    vi.setSystemTime(now + 130_000); // 130s > 2*60=120s
    render(<DataFreshness renderedAt={now} revalidateSeconds={60} />);
    expect(screen.getByText(/may be outdated/)).toBeInTheDocument();
  });

  it("updates display when interval fires", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(<DataFreshness renderedAt={now} revalidateSeconds={60} />);
    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();

    // Advance past the stale threshold (2*60s=120s) and trigger interval at 150s
    act(() => {
      vi.advanceTimersByTime(150_000);
    });

    expect(screen.getByText(/may be outdated/)).toBeInTheDocument();
    expect(screen.getByText(/2 min ago/)).toBeInTheDocument();
  });

  it("shows hours-ago format when age exceeds 60 minutes", () => {
    const now = Date.now();
    vi.setSystemTime(now + 3_700_000); // 3700s = ~61 minutes → "1h ago"
    render(<DataFreshness renderedAt={now} revalidateSeconds={60} />);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText(/1h ago/)).toBeInTheDocument();
  });
});
