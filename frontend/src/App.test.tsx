import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.endsWith("/api/health")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "ok", version: "0.1.0" }),
          } as Response);
        }
        if (url.endsWith("/api/flights/search")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                request: {
                  origin: "SFO",
                  destination: "PHX",
                  departure_date: "2026-05-15",
                },
                outbound: [
                  {
                    direction: "outbound",
                    price: 129,
                    currency: "USD",
                    duration_minutes: 150,
                    stops: 0,
                    legs: [
                      {
                        airline: "UA",
                        flight_number: "UA123",
                        origin: "SFO",
                        destination: "PHX",
                        departure_time: "2026-05-15T10:00:00",
                        arrival_time: "2026-05-15T12:30:00",
                        duration_minutes: 150,
                      },
                    ],
                  },
                ],
                ret: null,
                source: "fli",
                warnings: [],
              }),
          } as Response);
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );
  });

  it("renders the app title and backend status", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: /trip-planner/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/backend v0\.1\.0/i)).toBeInTheDocument();
    });
  });

  it("submits a search and renders results", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /outbound/i })).toBeInTheDocument();
      expect(screen.getByText("$129")).toBeInTheDocument();
      expect(screen.getByText("UA")).toBeInTheDocument();
    });
  });
});
