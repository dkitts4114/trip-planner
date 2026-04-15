import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: "ok", version: "0.1.0" }),
      }),
    );
  });

  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: /trip-planner/i })).toBeInTheDocument();
  });
});
