// High-quality PDF export using browser print CSS
// Replaces html2canvas/jsPDF screenshot approach with real vector text

import type { GeneratedReport } from "@/lib/llm-client";

export function exportToPDF(report: GeneratedReport, patientName?: string): void {
  const date = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const filename = `notER-report-${Date.now()}.pdf`;

  const prescriptionRows = report.prescriptions
    .map(
      (rx, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="drug">${rx.drug}</td>
        <td>${rx.dosage}</td>
        <td>${rx.frequency}</td>
        <td>${rx.duration}</td>
      </tr>`
    )
    .join("");

  const noPrescriptions =
    report.prescriptions.length === 0
      ? `<p class="empty">No prescriptions were explicitly mentioned during this consultation.</p>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Clinical Report — notER</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 18mm 18mm 22mm 18mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      line-height: 1.6;
      background: #fff;
    }

    /* ── Header ─────────────────────────── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #E11D48;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .header-left h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #E11D48;
      letter-spacing: -0.5px;
    }
    .header-left p {
      font-size: 9pt;
      color: #666;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 9pt;
      color: #555;
      line-height: 1.8;
    }
    .header-right strong { color: #1a1a2e; font-size: 10pt; }

    /* ── Summary banner ────────────────── */
    .summary-box {
      background: #fef2f2;
      border-left: 4px solid #E11D48;
      padding: 10px 14px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    .summary-box strong { color: #E11D48; }

    /* ── Section title ─────────────────── */
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1a1a2e;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 1.5px solid #e5e7eb;
      padding-bottom: 5px;
      margin-bottom: 14px;
      margin-top: 22px;
    }

    /* ── SOAP Notes ────────────────────── */
    .soap-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 6px;
    }
    .soap-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .soap-label {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 5px;
    }
    .soap-item:nth-child(1) .soap-label { color: #2563EB; }
    .soap-item:nth-child(2) .soap-label { color: #059669; }
    .soap-item:nth-child(3) .soap-label { color: #D97706; }
    .soap-item:nth-child(4) .soap-label { color: #7C3AED; }
    .soap-content { font-size: 10pt; color: #374151; line-height: 1.55; }

    /* ── Prescription ──────────────────── */
    .rx-symbol {
      font-family: serif;
      font-size: 24pt;
      color: #E11D48;
      display: inline-block;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-top: 8px;
    }
    thead tr { background: #1a1a2e; }
    th {
      padding: 8px 12px;
      text-align: left;
      color: #fff;
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    td.drug { font-weight: 600; color: #1a1a2e; }
    td.num { color: #E11D48; font-weight: 700; width: 30px; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #f9fafb; }
    .empty { font-size: 10pt; color: #6b7280; font-style: italic; padding: 8px 0; }

    /* ── Footer ────────────────────────── */
    .footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1.5px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-note { font-size: 8pt; color: #9ca3af; }
    .signature { text-align: right; }
    .signature-line {
      width: 180px;
      border-top: 1px solid #374151;
      margin-top: 36px;
      padding-top: 6px;
      font-size: 9pt;
      color: #555;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>notER</h1>
      <p>AI Clinical Copilot — Cardiology</p>
    </div>
    <div class="header-right">
      <strong>Clinical Report</strong><br/>
      Patient: ${patientName ?? "Current Patient"}<br/>
      Date: ${date}<br/>
      Generated: ${new Date().toLocaleTimeString("en-IN")}
    </div>
  </div>

  <div class="summary-box">
    <strong>Summary:</strong> ${report.summary}
  </div>

  <div class="section-title">🧾 Clinical Notes (SOAP)</div>
  <div class="soap-grid">
    <div class="soap-item">
      <div class="soap-label">S — Subjective</div>
      <div class="soap-content">${report.soap.subjective}</div>
    </div>
    <div class="soap-item">
      <div class="soap-label">O — Objective</div>
      <div class="soap-content">${report.soap.objective}</div>
    </div>
    <div class="soap-item">
      <div class="soap-label">A — Assessment</div>
      <div class="soap-content">${report.soap.assessment}</div>
    </div>
    <div class="soap-item">
      <div class="soap-label">P — Plan</div>
      <div class="soap-content">${report.soap.plan}</div>
    </div>
  </div>

  <div class="section-title">💊 Prescription</div>
  <div class="rx-symbol">℞</div>
  ${
    report.prescriptions.length > 0
      ? `<table>
    <thead>
      <tr>
        <th>#</th><th>Drug</th><th>Dosage</th><th>Frequency</th><th>Duration</th>
      </tr>
    </thead>
    <tbody>${prescriptionRows}</tbody>
  </table>`
      : noPrescriptions
  }

  <div class="footer">
    <div class="footer-note">Generated by notER — AI Clinical Copilot<br/>${new Date().toISOString()}</div>
    <div class="signature">
      <div class="signature-line">Doctor's Signature</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      document.title = "${filename}";
      window.print();
    }
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download the PDF.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printPrescription(report: GeneratedReport): void {
  const date = new Date().toLocaleDateString("en-IN");

  const prescriptionRows = report.prescriptions
    .map(
      (rx, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="drug">${rx.drug}</td>
        <td>${rx.dosage}</td>
        <td>${rx.frequency}</td>
        <td>${rx.duration}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Prescription — notER</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @page { size: A5; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #1a1a2e; font-size: 10pt; }
    .rx-header { text-align: center; border-bottom: 3px double #E11D48; padding-bottom: 12px; margin-bottom: 14px; }
    .rx-header h1 { font-size: 18pt; color: #E11D48; font-weight: 700; }
    .rx-header p { font-size: 9pt; color: #666; margin-top: 3px; }
    .meta { display:flex; justify-content:space-between; font-size:9pt; padding:8px 0; border-bottom:1px solid #ddd; margin-bottom:12px; }
    .rx-symbol { font-family:serif; font-size:28pt; color:#E11D48; margin-bottom:8px; }
    table { width:100%; border-collapse:collapse; font-size:9.5pt; }
    th { background:#1a1a2e; color:#fff; padding:7px 10px; text-align:left; font-size:8pt; text-transform:uppercase; }
    td { padding:8px 10px; border-bottom:1px solid #eee; }
    td:first-child { color:#E11D48; font-weight:700; width:25px; }
    td.drug { font-weight:600; }
    .sig-line { margin-top:35px; display:flex; justify-content:flex-end; }
    .sig { width:160px; border-top:1px solid #333; padding-top:5px; font-size:8pt; color:#666; text-align:center; }
    .footer { margin-top:20px; font-size:7.5pt; color:#aaa; text-align:center; }
  </style>
</head>
<body>
  <div class="rx-header">
    <h1>notER</h1>
    <p>AI Clinical Copilot — Cardiology</p>
  </div>
  <div class="meta">
    <span><strong>Patient:</strong> [Patient Name]</span>
    <span><strong>Date:</strong> ${date}</span>
  </div>
  <div class="rx-symbol">℞</div>
  <table>
    <thead><tr><th>#</th><th>Drug</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
    <tbody>${prescriptionRows}</tbody>
  </table>
  <div class="sig-line"><div class="sig">Doctor's Signature</div></div>
  <div class="footer">Generated by notER &mdash; AI Clinical Copilot</div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
