"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SearchResult } from "@/lib/qdrant-client";

interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface PrescriptionItem {
  drug: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Props {
  records: SearchResult[];
  doctorEmail: string;
}

export default function DashboardClient({ records, doctorEmail }: Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [search, records]);

  function parseSOAP(raw: string): SOAPNotes | null {
    try { return JSON.parse(raw); } catch { return null; }
  }

  function parsePrescriptions(raw: string): PrescriptionItem[] {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return iso; }
  }

  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}>

      {/* ── Navigation ─────────────────────────── */}
      <nav className="header">
        <div className="header__brand">
          <div className="header__logo">🫀</div>
          <div>
            <div className="header__title">
              not<span>ER</span>
            </div>
            <div className="header__subtitle">Patient Records</div>
          </div>
        </div>

        <div className="header__status">
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "var(--text-secondary)",
            padding: "4px 10px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)",
          }}>
            <span>👨‍⚕️</span> {doctorEmail}
          </div>

          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px",
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            borderRadius: "var(--radius-md)",
            color: "#fff", fontSize: 13, fontWeight: 600,
            textDecoration: "none", boxShadow: "0 2px 10px rgba(225,29,72,0.3)",
          }}>
            ＋ New Consultation
          </Link>

          <form action={logoutAction}>
            <button type="submit" className="btn btn--ghost" style={{ fontSize: 12 }}>
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16, marginBottom: 32,
        }}>
          {[
            { label: "Total Consultations", value: records.length, icon: "📋", color: "var(--accent)" },
            { label: "Patients This Month",
              value: records.filter(r => (r.date || "").startsWith(thisMonth)).length,
              icon: "📅", color: "var(--info)" },
            { label: "Search Results", value: filtered.length, icon: "🔍", color: "var(--success)" },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color, letterSpacing: "-0.04em" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Page heading */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Consultation History
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Click any record to view SOAP notes and prescriptions
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", fontSize: 14, color: "var(--text-tertiary)",
          }}>🔍</span>
          <input
            id="search-records"
            type="text"
            placeholder="Search by patient name, symptom, drug, or keyword…"
            value={search}
            onChange={(e) => startTransition(() => setSearch(e.target.value))}
            style={{
              width: "100%", padding: "12px 14px 12px 40px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-lg)",
              color: "var(--text-primary)", fontSize: 14,
              outline: "none", transition: "border-color 0.2s",
              fontFamily: "var(--font-sans)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-strong)")}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none",
              color: "var(--text-tertiary)", cursor: "pointer", fontSize: 18,
            }}>×</button>
          )}
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "72px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>
              {records.length === 0 ? "📋" : "🔍"}
            </div>
            <div style={{ fontSize: 17, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>
              {records.length === 0 ? "No patient records yet" : `No results for "${search}"`}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {records.length === 0
                ? "Complete a consultation and it will appear here"
                : "Try a different search term"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((record) => {
              const isExpanded = expandedId === record.id;
              const soap = parseSOAP(record.soapNotes);
              const prescriptions = parsePrescriptions(record.prescriptions);

              return (
                <div key={record.id} className="card" style={{
                  borderColor: isExpanded ? "var(--accent-border)" : "var(--border)",
                  transition: "border-color 0.2s",
                }}>
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "16px 20px",
                      background: "none", border: "none",
                      cursor: "pointer", color: "inherit",
                      display: "flex", alignItems: "flex-start",
                      justifyContent: "space-between", gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: "flex", alignItems: "center",
                        gap: 10, marginBottom: 6, flexWrap: "wrap",
                      }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                          👤 {record.patientName}
                        </span>
                        <span style={{
                          fontSize: 11, color: "var(--text-tertiary)",
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          padding: "2px 8px", borderRadius: "var(--radius-full)",
                        }}>
                          📅 {formatDate(record.date)}
                        </span>
                        {prescriptions.length > 0 && (
                          <span style={{
                            fontSize: 11, color: "var(--success)",
                            background: "var(--success-subtle)",
                            border: "1px solid var(--success-border)",
                            padding: "2px 8px", borderRadius: "var(--radius-full)",
                          }}>
                            💊 {prescriptions.length} Rx
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 8px" }}>
                        {record.summary}
                      </p>
                      {record.keywords.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {record.keywords.slice(0, 6).map((kw) => (
                            <span key={kw} className="keyword-tag keyword-tag--condition">
                              {kw}
                            </span>
                          ))}
                          {record.keywords.length > 6 && (
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                              +{record.keywords.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span style={{
                      color: "var(--text-tertiary)", fontSize: 16, flexShrink: 0,
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                    }}>▾</span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{
                      borderTop: "1px solid var(--border)",
                      padding: "20px",
                      animation: "fadeIn 0.25s ease-out forwards",
                    }}>
                      {/* SOAP */}
                      {soap && (
                        <>
                          <div className="card__title" style={{ marginBottom: 14 }}>
                            🧾 SOAP Notes
                          </div>
                          <div style={{
                            display: "grid", gridTemplateColumns: "repeat(2,1fr)",
                            gap: 10, marginBottom: 24,
                          }}>
                            {([
                              { key: "s", label: "S — Subjective", value: soap.subjective },
                              { key: "o", label: "O — Objective",  value: soap.objective },
                              { key: "a", label: "A — Assessment", value: soap.assessment },
                              { key: "p", label: "P — Plan",       value: soap.plan },
                            ] as { key: string; label: string; value: string }[]).map((s) => (
                              <div key={s.key} className={`soap-card soap-card--${s.key}`}>
                                <div className="soap-card__label">{s.label}</div>
                                <div className="soap-card__text">{s.value || "Not recorded"}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Prescriptions */}
                      <div className="card__title" style={{ marginBottom: 12 }}>
                        💊 Prescriptions
                      </div>

                      {prescriptions.length > 0 ? (
                        <table className="rx-table">
                          <thead>
                            <tr>
                              {["#", "Drug", "Dosage", "Frequency", "Duration"].map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {prescriptions.map((rx, i) => (
                              <tr key={i}>
                                <td className="rx-num">{i + 1}</td>
                                <td className="rx-drug">{rx.drug}</td>
                                <td>{rx.dosage}</td>
                                <td>{rx.frequency}</td>
                                <td>{rx.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ fontSize: 13, color: "var(--text-tertiary)", fontStyle: "italic" }}>
                          No prescriptions recorded for this consultation.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
