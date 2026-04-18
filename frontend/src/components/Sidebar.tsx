/**
 * Sidebar — two sections:
 *   1. Profile  : persistent preferences that pre-fill searches
 *   2. Filters  : sort + filter applied to the current result set
 */
import { useState } from "react";
import type { UserProfile } from "../hooks/useProfile";
import type { FlightFilters, SortKey } from "../lib/filterFlights";
import { DEFAULT_FILTERS } from "../lib/filterFlights";

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
  display: "block",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  fontSize: 13,
  border: "1px solid #d1d5db",
  borderRadius: 5,
  boxSizing: "border-box",
  background: "#fff",
};

const select: React.CSSProperties = { ...input };

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: "16px 0 8px",
  paddingBottom: 4,
  borderBottom: "1px solid #e5e7eb",
};

const field = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  marginBottom: 12,
  ...extra,
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Field({ label: lbl, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={field()}>
      <span style={label}>{lbl}</span>
      {children}
    </div>
  );
}

function HourSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const fmt = (h: number) =>
    h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  return (
    <select
      style={{ ...select, width: "48%" }}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {hours.map((h) => (
        <option key={h} value={h}>
          {fmt(h)}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

interface ProfileProps {
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  onReset: () => void;
}

function ProfileSection({ profile, setProfile, onReset }: ProfileProps) {
  return (
    <>
      <p style={sectionTitle}>Profile</p>

      <Field label="Home Airport (IATA)">
        <input
          style={input}
          maxLength={3}
          value={profile.homeAirport}
          onChange={(e) => setProfile({ homeAirport: e.target.value.toUpperCase() })}
          placeholder="SFO"
        />
      </Field>

      <Field label="Default Adults">
        <input
          style={input}
          type="number"
          min={1}
          max={9}
          value={profile.defaultAdults}
          onChange={(e) => setProfile({ defaultAdults: Number(e.target.value) })}
        />
      </Field>

      <Field label="Default Travel Class">
        <select
          style={select}
          value={profile.defaultCabin}
          onChange={(e) => setProfile({ defaultCabin: e.target.value as UserProfile["defaultCabin"] })}
        >
          <option value="economy">Economy</option>
          <option value="premium_economy">Premium Economy</option>
          <option value="business">Business</option>
          <option value="first">First</option>
        </select>
      </Field>

      <Field label="Default Max Stops">
        <select
          style={select}
          value={profile.defaultMaxStops}
          onChange={(e) => setProfile({ defaultMaxStops: e.target.value as UserProfile["defaultMaxStops"] })}
        >
          <option value="any">Any</option>
          <option value="non_stop">Non-stop only</option>
          <option value="one_stop">≤ 1 stop</option>
          <option value="two_plus">≥ 2 stops ok</option>
        </select>
      </Field>

      <p style={sectionTitle}>Calendar Settings</p>

      <Field label="Trip Duration (for calendar scan)">
        <select
          style={select}
          value={profile.tripDuration}
          onChange={(e) => setProfile({ tripDuration: e.target.value as UserProfile["tripDuration"] })}
        >
          <option value="weekend">Weekend (Sat–Sun)</option>
          <option value="long_weekend">Long Weekend (Fri–Mon)</option>
          <option value="week">Full Week (7 days)</option>
        </select>
      </Field>

      <Field label="Look-ahead Window">
        <select
          style={select}
          value={profile.lookAheadMonths}
          onChange={(e) => setProfile({ lookAheadMonths: Number(e.target.value) })}
        >
          <option value={1}>1 month</option>
          <option value={2}>2 months</option>
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
        </select>
      </Field>

      <button
        onClick={onReset}
        style={{
          width: "100%",
          padding: "5px 0",
          fontSize: 12,
          color: "#6b7280",
          background: "none",
          border: "1px solid #d1d5db",
          borderRadius: 5,
          cursor: "pointer",
          marginTop: 4,
        }}
      >
        Reset to defaults
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Filters section
// ---------------------------------------------------------------------------

interface FiltersProps {
  filters: FlightFilters;
  setFilters: (f: Partial<FlightFilters>) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price", label: "Price (lowest first)" },
  { value: "duration", label: "Total flight time" },
  { value: "departure", label: "Departure time" },
  { value: "arrival", label: "Arrival time" },
  { value: "layover", label: "Layover time (shortest)" },
];

function FiltersSection({ filters, setFilters, onReset }: FiltersProps) {
  function csvToList(v: string): string[] {
    return v
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  return (
    <>
      <p style={sectionTitle}>Sort & Filter Results</p>

      <Field label="Sort by">
        <select
          style={select}
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value as SortKey })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Departure time window">
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HourSelect
            value={filters.departureStart}
            onChange={(v) => setFilters({ departureStart: v })}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>→</span>
          <HourSelect
            value={filters.departureEnd}
            onChange={(v) => setFilters({ departureEnd: v })}
          />
        </div>
      </Field>

      <Field label="Arrival time window">
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <HourSelect
            value={filters.arrivalStart}
            onChange={(v) => setFilters({ arrivalStart: v })}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>→</span>
          <HourSelect
            value={filters.arrivalEnd}
            onChange={(v) => setFilters({ arrivalEnd: v })}
          />
        </div>
      </Field>

      <Field label="Max layover time">
        <select
          style={select}
          value={filters.maxLayoverMinutes ?? ""}
          onChange={(e) =>
            setFilters({
              maxLayoverMinutes: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        >
          <option value="">No limit</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={180}>3 hours</option>
          <option value={300}>5 hours</option>
        </select>
      </Field>

      <Field label="Airlines to avoid (IATA codes, comma-separated)">
        <input
          style={input}
          placeholder="e.g. AA, DL, F9"
          defaultValue={filters.avoidAirlines.join(", ")}
          onChange={(e) => setFilters({ avoidAirlines: csvToList(e.target.value) })}
        />
        <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "block" }}>
          AA · UA · DL · WN · AS · B6 · F9 · NK
        </span>
      </Field>

      <Field label="Layover airports to avoid (IATA codes, comma-separated)">
        <input
          style={input}
          placeholder="e.g. ORD, DFW, ATL"
          defaultValue={filters.avoidLayoverAirports.join(", ")}
          onChange={(e) => setFilters({ avoidLayoverAirports: csvToList(e.target.value) })}
        />
        <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "block" }}>
          Common hubs: ORD · DFW · ATL · LAX · DEN · PHX
        </span>
      </Field>

      <button
        onClick={onReset}
        style={{
          width: "100%",
          padding: "5px 0",
          fontSize: 12,
          color: "#6b7280",
          background: "none",
          border: "1px solid #d1d5db",
          borderRadius: 5,
          cursor: "pointer",
          marginTop: 4,
        }}
      >
        Reset filters
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

export type SidebarTab = "profile" | "filters";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activeTab: SidebarTab;
  onTabChange: (t: SidebarTab) => void;
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  onResetProfile: () => void;
  filters: FlightFilters;
  setFilters: (f: Partial<FlightFilters>) => void;
  onResetFilters: () => void;
  resultCount: number | null; // null when no search done yet
}

export function Sidebar({
  open,
  onClose,
  activeTab,
  onTabChange,
  profile,
  setProfile,
  onResetProfile,
  filters,
  setFilters,
  onResetFilters,
  resultCount,
}: SidebarProps) {
  const WIDTH = 260;

  const tabBtn = (t: SidebarTab, label: string): React.CSSProperties => ({
    flex: 1,
    padding: "6px 0",
    fontSize: 12,
    fontWeight: 600,
    background: activeTab === t ? "#2563eb" : "#f3f4f6",
    color: activeTab === t ? "#fff" : "#374151",
    border: "none",
    borderRadius: t === "profile" ? "4px 0 0 4px" : "0 4px 4px 0",
    cursor: "pointer",
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: open ? 0 : -WIDTH - 10,
        width: WIDTH,
        height: "100vh",
        background: "#f9fafb",
        borderRight: "1px solid #e5e7eb",
        boxShadow: open ? "2px 0 12px rgba(0,0,0,0.08)" : "none",
        transition: "left 0.22s ease",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 14px 10px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Settings</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#6b7280",
            lineHeight: 1,
            padding: 0,
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", padding: "10px 14px 0", flexShrink: 0 }}>
        <button style={tabBtn("profile", "Profile")} onClick={() => onTabChange("profile")}>
          Profile
        </button>
        <button style={tabBtn("filters", "Filters")} onClick={() => onTabChange("filters")}>
          Filters
          {resultCount !== null && (
            <span
              style={{
                marginLeft: 5,
                background: activeTab === "filters" ? "rgba(255,255,255,0.25)" : "#2563eb",
                color: "#fff",
                borderRadius: 10,
                padding: "0 5px",
                fontSize: 10,
              }}
            >
              {resultCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "4px 14px 24px", flex: 1 }}>
        {activeTab === "profile" ? (
          <ProfileSection
            profile={profile}
            setProfile={setProfile}
            onReset={onResetProfile}
          />
        ) : (
          <FiltersSection
            filters={filters}
            setFilters={setFilters}
            onReset={onResetFilters}
          />
        )}
      </div>
    </div>
  );
}
