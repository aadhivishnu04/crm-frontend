import React, { useState, useEffect, useRef } from 'react';
import {
    Eye, Pencil, Search, MapPin, Calendar, 
    CreditCard, AlertCircle, CheckCircle2,
    CheckSquare, FileText, X, ArrowUp, DollarSign, Wallet,
    ChevronRight, ChevronDown, Plus, Printer
} from 'lucide-react';
import logoAsset from '../assets/logo (2).png';

// ─── NETWORK CONFIGURATION ────────────────────────────────────────────────────
const API_BASE_URL = "https://crm-backend-f9n8.onrender.com/api";

// ─────────────────────────────────────────────
// PRO-FORMA INVOICE GENERATOR (per service, print/download PDF)
// ─────────────────────────────────────────────
const LOGO_DATA_URI = logoAsset;

const COMPANY_INFO = {
    name: "Rethink Ways Pvt. Ltd.",
    addressLine1: "4B, 59, Sagas Amar Court, GN Chetty Road",
    addressLine2: "T Nagar, Chennai – 600 017, Tamil Nadu, India",
    phone: "+91 93840 00347",
    email: "info@itour.co.in",
    website: "www.itour.co.in",
    gstin: "33AANCR6176N1ZN",
    bankName: "Rethink Ways Private Limited",
    bankAC: "2402 4171 5974 6945",
    bankIFSC: "AUBL0004171",
    bankBranch: "AU Small Finance Bank, Chennai Anna Nagar",
};

function formatInvoiceDate(d) {
    const dt = d ? new Date(d) : new Date();
    if (isNaN(dt.getTime())) return new Date().toLocaleDateString('en-GB');
    return dt.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

function buildServiceDescription(lead) {
    const parts = [];
    const dest = lead.destination || lead.confirmedDestination;
    if (dest) parts.push(dest);
    const duration = lead.confirmedDuration || lead.duration;
    if (duration) parts.push(duration);
    const travelDate = lead.tourStartDate || lead.travelDate || lead.travelDates;
    if (travelDate) {
        try {
            const dt = new Date(travelDate);
            if (!isNaN(dt.getTime())) {
                parts.push(dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' }));
            }
        } catch (e) { /* ignore */ }
    }
    const notes = lead.leadMessage || lead.tourPreference || lead.specialRequest;
    if (notes) parts.push(notes);
    return parts.length ? parts.join(', ') : 'Tour Package';
}

function generateInvoiceHTML({ piNo, lead, serviceName, serviceCost, paxLabel }) {
    const customerName = lead.customerName || lead.profileName || 'Guest';
    const customerCity = lead.city || lead.location || lead.customerCity || '';
    const description = buildServiceDescription(lead);
    const amountFormatted = `Rs. ${Number(serviceCost || 0).toLocaleString('en-IN')}/-`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Pro-Forma Invoice - ${piNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background: #f1f5f9; color: #0f172a; }
  .page { width: 720px; margin: 24px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
  .content { padding: 34px 40px 10px 40px; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .badge { background: #17B3A6; color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; padding: 10px 22px; border-radius: 8px; display: inline-block; margin-bottom: 18px; }
  .brand { text-align: right; }
  .brand-name { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }
  .brand-name .accent { color: #17B3A6; }
  .brand-sub { font-size: 11px; color: #17B3A6; font-weight: 600; margin: -2px 0 8px 0; }
  .logo-img { width: 190px; height: auto; display: inline-block; margin-bottom: 8px; }
  .company { font-size: 15px; font-weight: 800; color: #0f172a; margin: 6px 0 2px 0; }
  .company-addr { font-size: 11.5px; color: #475569; line-height: 1.5; margin: 0; }
  .meta { font-size: 12.5px; color: #0f172a; margin: 18px 0 4px 0; }
  .meta b { font-weight: 700; }
  .issued-to { font-size: 13px; color: #0f172a; margin: 10px 0 2px 0; }
  .cust-name { font-size: 16px; font-weight: 800; margin: 2px 0; }
  .cust-city { font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 14px 0; }
  .gstin-box { border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; text-align: center; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 0; }
  table.invoice-table { width: 100%; border-collapse: collapse; margin-top: 22px; }
  table.invoice-table th { background: #17B3A6; color: #fff; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.3px; padding: 12px 16px; text-align: left; }
  table.invoice-table td { padding: 18px 16px; font-size: 13.5px; background: #E3F7F5; border-bottom: 6px solid #fff; vertical-align: top; }
  table.invoice-table td.center { text-align: center; }
  table.invoice-table td.right { text-align: right; font-weight: 800; }
  .net-row td { background: #E3F7F5; font-weight: 800; font-size: 14.5px; }
  .net-label { text-align: left; }
  .happy-touring { text-align: center; font-family: 'Dancing Script', cursive; font-size: 40px; font-weight: 700; color: #0f172a; margin: 26px 0 20px 0; }
  .bottom-grid { display: flex; gap: 24px; margin-bottom: 24px; }
  .bank-box { background: #E3F7F5; border-radius: 10px; padding: 16px 20px; flex: 1; }
  .bank-box h4 { margin: 0 0 8px 0; font-size: 13px; font-style: italic; color: #0f172a; }
  .bank-box p { margin: 2px 0; font-size: 12.5px; font-weight: 600; color: #1e293b; }
  .pattern-box { flex: 1; padding: 4px 4px; }
  .pattern-box h4 { margin: 0 0 10px 0; font-size: 13.5px; font-weight: 800; }
  .pattern-row { display: flex; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #e2e8f0; }
  .pattern-pct { width: 44px; font-weight: 800; }
  .pattern-dash { width: 20px; }
  .footer-bar { background: #17B3A6; color: #fff; font-size: 10.5px; font-weight: 600; padding: 12px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
  .footer-bar span { white-space: nowrap; }
  @media print {
    body { background: #fff; }
    .page { margin: 0 auto; box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="content">
      <div class="top-row">
        <div>
          <div class="badge">PRO-FORMA INVOICE</div>
          <div class="meta"><b>PI No.:</b> ${piNo} &nbsp; <b>Date:</b> ${formatInvoiceDate()}</div>
          <div class="issued-to">Issued to</div>
          <div class="cust-name">${customerName}</div>
          ${customerCity ? `<div class="cust-city">${customerCity}</div>` : ''}
        </div>
        <div class="brand">
          <img src="${LOGO_DATA_URI}" alt="i&gt;Tour by Rethink Ways Pvt. Ltd." class="logo-img" />
          <p class="company">${COMPANY_INFO.name}</p>
          <p class="company-addr">
            ${COMPANY_INFO.addressLine1}<br/>
            ${COMPANY_INFO.addressLine2}<br/>
            ${COMPANY_INFO.phone} | ${COMPANY_INFO.email} | ${COMPANY_INFO.website}
          </p>
        </div>
      </div>

      <div class="gstin-box">GSTIN ${COMPANY_INFO.gstin}</div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width:16%">Service</th>
            <th style="width:40%">Description</th>
            <th style="width:18%">No. of Pax</th>
            <th style="width:26%">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:800;">${serviceName}</td>
            <td>${description}</td>
            <td class="center">${paxLabel}</td>
            <td class="right">${amountFormatted}</td>
          </tr>
          <tr class="net-row">
            <td colspan="3" class="net-label">Net Payable</td>
            <td class="right">${amountFormatted}</td>
          </tr>
        </tbody>
      </table>

      <div class="happy-touring">Happy Touring...</div>

      <div class="bottom-grid">
        <div class="bank-box">
          <h4>Bank Details</h4>
          <p style="font-weight:800;">${COMPANY_INFO.bankName}</p>
          <p>AC: ${COMPANY_INFO.bankAC}</p>
          <p>IFSC: ${COMPANY_INFO.bankIFSC}</p>
          <p>${COMPANY_INFO.bankBranch}</p>
        </div>
        <div class="pattern-box">
          <h4>Payment Pattern</h4>
          <div class="pattern-row"><span class="pattern-pct">10%</span><span class="pattern-dash">-</span><span>24 Hours From Booking</span></div>
          <div class="pattern-row"><span class="pattern-pct">40%</span><span class="pattern-dash">-</span><span>10 Days From Booking</span></div>
          <div class="pattern-row" style="border-bottom:none;"><span class="pattern-pct">50%</span><span class="pattern-dash">-</span><span>15 Days Before Travel</span></div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <span>&#9993; ${COMPANY_INFO.email}</span>
      <span>&#127760; ${COMPANY_INFO.website}</span>
      <span>&#9742; ${COMPANY_INFO.phone}</span>
      <span>&#128205; 59, GN Chetty Road T Nagar, Chennai - 600 017</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

function printServiceInvoice(lead, serviceName, serviceCost) {
    const adults = lead.noOfPax || lead.confirmedNoOfPax || 1;
    const children = lead.noOfChildren || lead.confirmedNoOfChildren || 0;
    const paxLabel = `${String(adults).padStart(2, '0')} Adult${Number(adults) > 1 ? 's' : ''}${Number(children) > 0 ? ` + ${children} Child${Number(children) > 1 ? 'ren' : ''}` : ''}`;
    const piNo = `PI${String(lead.id).padStart(6, '0')}`;

    const html = generateInvoiceHTML({ piNo, lead, serviceName, serviceCost, paxLabel });
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) {
        alert('Please allow pop-ups to print/download the invoice.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

// ─────────────────────────────────────────────
// PAYMENT RECEIPT GENERATOR (per transaction, print/download PDF)
// ─────────────────────────────────────────────
function numberToWords(num) {
    num = Math.round(Number(num) || 0);
    if (num === 0) return 'Zero Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigits = (n) => {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    };
    const threeDigits = (n) => {
        if (n >= 100) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
        return twoDigits(n);
    };

    let result = '';
    const crore = Math.floor(num / 10000000); num %= 10000000;
    const lakh = Math.floor(num / 100000); num %= 100000;
    const thousand = Math.floor(num / 1000); num %= 1000;
    const hundred = num;

    if (crore) result += threeDigits(crore) + ' Crore ';
    if (lakh) result += threeDigits(lakh) + ' Lakh ';
    if (thousand) result += threeDigits(thousand) + ' Thousand ';
    if (hundred) result += threeDigits(hundred) + ' ';

    return result.trim() + ' Only';
}

function buildReceiptDescription(lead) {
    const parts = [];
    const dest = lead.destination || lead.confirmedDestination;
    if (dest) parts.push(dest);
    const duration = lead.confirmedDuration || lead.duration;
    if (duration) parts.push(duration);
    return parts.length ? parts.join(' > ') : (lead.confirmedServices || lead.services || 'Tour Package');
}

function generateReceiptHTML({ prNo, lead, txn, paymentDateLabel, generatedDateLabel }) {
    const customerName = lead.customerName || lead.profileName || 'Guest';
    const customerCity = lead.city || lead.location || lead.customerCity || '';
    const description = buildReceiptDescription(lead);
    const amountNum = Number(String(txn.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
    const amountFormatted = `Rs.${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const paymentReference = `${txn.mode || 'N/A'}${txn.transactionId ? ' - ' + txn.transactionId : ''}`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Payment Receipt - ${prNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Dancing+Script:wght@600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background: #f1f5f9; color: #0f172a; }
  .page { position: relative; width: 720px; margin: 24px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
  .logo-mark { position: relative; width: 44px; height: 40px; margin-bottom: 12px; }
  .logo-mark .sq-solid { position: absolute; top: 0; left: 14px; width: 18px; height: 18px; background: #17B3A6; }
  .logo-mark .sq-outline { position: absolute; top: 15px; left: 0; width: 18px; height: 18px; border: 3px solid #17B3A6; }
  .content { padding: 44px 48px 0 48px; }
  .top-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .badge { background: #17B3A6; color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; padding: 10px 22px; border-radius: 4px; display: inline-block; margin-bottom: 18px; }
  .brand { text-align: right; }
  .brand-name { font-size: 30px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1; }
  .brand-name .accent { color: #17B3A6; }
  .brand-sub { font-size: 11.5px; color: #17B3A6; font-weight: 600; margin: 2px 0 12px 0; }
  .logo-img { width: 190px; height: auto; display: inline-block; margin-bottom: 10px; }
  .company { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
  .company-addr { font-size: 12px; color: #475569; line-height: 1.5; margin: 0; }
  .meta { font-size: 13px; color: #0f172a; margin: 16px 0 4px 0; }
  .meta b { font-weight: 800; }
  .issued-to { font-size: 13px; color: #0f172a; margin: 10px 0 2px 0; }
  .cust-name { font-size: 16px; font-weight: 800; margin: 2px 0; }
  .cust-city { font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 4px 0; }
  .gstin-box { border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 22px; font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
  table.receipt-table { width: 100%; border-collapse: collapse; margin-top: 26px; border: 1px solid #cbd5e1; }
  table.receipt-table th { background: #17B3A6; color: #fff; font-size: 13px; font-weight: 700; padding: 14px 18px; text-align: left; }
  table.receipt-table th.amt { text-align: right; }
  table.receipt-table td { padding: 22px 18px; font-size: 14px; border: 1px solid #cbd5e1; vertical-align: top; }
  table.receipt-table td.amt { text-align: right; font-weight: 800; white-space: nowrap; }
  .words-row td, .ref-row td { padding: 12px 18px; font-size: 13px; border: 1px solid #cbd5e1; }
  .ref-row .ref-date { text-align: right; }
  .thanks { text-align: center; font-family: 'Dancing Script', cursive; font-size: 30px; font-weight: 700; color: #0f172a; padding: 20px 18px; border: 1px solid #cbd5e1; border-top: none; position: relative; }
  .footer-bar { background: #17B3A6; color: #fff; font-size: 10.5px; font-weight: 600; padding: 14px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-top: 26px; }
  .footer-bar span { white-space: nowrap; }
  @media print {
    body { background: #fff; }
    .page { margin: 0 auto; box-shadow: none; border-radius: 0; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="content">
      <div class="top-row">
        <div>
          <div class="logo-mark"><div class="sq-solid"></div><div class="sq-outline"></div></div>
          <div class="badge">PAYMENT RECEIPT</div>
          <div class="meta"><b>PR No:</b> ${prNo} &nbsp; <b>Date:</b> ${paymentDateLabel}</div>
          <div class="issued-to">Billed To</div>
          <div class="cust-name">${customerName}</div>
          ${customerCity ? `<div class="cust-city">${customerCity}</div>` : ''}
        </div>
        <div class="brand">
          <img src="${LOGO_DATA_URI}" alt="i&gt;Tour by Rethink Ways Pvt. Ltd." class="logo-img" />
          <p class="company">${COMPANY_INFO.name}</p>
          <p class="company-addr">
            ${COMPANY_INFO.addressLine1}<br/>
            ${COMPANY_INFO.addressLine2}<br/>
            ${COMPANY_INFO.phone} | ${COMPANY_INFO.email} | ${COMPANY_INFO.website}
          </p>
        </div>
      </div>

      <div class="gstin-box">GSTIN ${COMPANY_INFO.gstin}</div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${description}</td>
            <td class="amt">${amountFormatted}</td>
          </tr>
        </tbody>
      </table>
      <table class="receipt-table" style="margin-top: 0; border-top: none;">
        <tbody>
          <tr class="words-row">
            <td colspan="2">Amount (in words) : <b>${numberToWords(amountNum)}</b></td>
          </tr>
          <tr class="ref-row">
            <td>Payment Reference : ${paymentReference}</td>
            <td class="ref-date">Date: ${generatedDateLabel}</td>
          </tr>
        </tbody>
      </table>
      <div class="thanks">Thanks for your Business...</div>
    </div>

    <div class="footer-bar">
      <span>&#9993; ${COMPANY_INFO.email}</span>
      <span>&#127760; ${COMPANY_INFO.website}</span>
      <span>&#9742; ${COMPANY_INFO.phone}</span>
      <span>&#128205; 59, GN Chetty Road T Nagar, Chennai - 600 017</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}

// Persistent, ever-increasing PR (Payment Receipt) number — starts at 0000 and
// bumps by exactly 1 every time a receipt is actually generated/downloaded,
// regardless of which lead or transaction it belongs to. Stored in localStorage
// so the sequence survives page reloads and new sessions on this device.
const PR_COUNTER_KEY = 'itour_pr_receipt_counter';
function getNextPrNumber() {
    const current = parseInt(localStorage.getItem(PR_COUNTER_KEY), 10);
    const next = Number.isFinite(current) ? current + 1 : 0;
    localStorage.setItem(PR_COUNTER_KEY, String(next));
    return `PR ${String(next).padStart(4, '0')}`;
}

function printPaymentReceipt(lead, txn, index) {
    const prNo = getNextPrNumber();
    const paymentDateLabel = txn.date ? formatInvoiceDate(txn.date) : formatInvoiceDate();
    const generatedDateLabel = formatInvoiceDate(); // today — when the receipt is generated

    const html = generateReceiptHTML({ prNo, lead, txn, paymentDateLabel, generatedDateLabel });
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) {
        alert('Please allow pop-ups to print/download the receipt.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

// ─────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder = "-- Select --", className }) => {
    const normalizedOptions = options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    const safeValue = value !== undefined && value !== null ? String(value) : '';
    return (
        <select value={safeValue} onChange={(e) => onChange(e.target.value)} className={className}>
            <option value="" disabled hidden>{placeholder}</option>
            {normalizedOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
};

const DatePickerField = ({ value, onChange, type = "date", readOnly = false, className }) => {
    const inputRef = useRef(null);
    return (
        <div className={`relative w-full flex items-center ${!readOnly ? 'cursor-pointer' : ''}`} onClick={() => { if (!readOnly && inputRef.current?.showPicker) inputRef.current.showPicker(); }}>
            <input ref={inputRef} type={type} value={value || ''} onChange={onChange} readOnly={readOnly} className={`${className} ${readOnly ? '' : 'cursor-pointer'} custom-date-input`} style={{ paddingRight: '2.5rem', colorScheme: 'dark' }} />
            <Calendar size={15} className={`absolute right-3 pointer-events-none ${readOnly ? 'text-slate-600' : 'text-cyan-500'}`} />
        </div>
    );
};

// ─────────────────────────────────────────────
// COLLAPSIBLE FORM SECTION
// ─────────────────────────────────────────────
function CollapsibleSection({ title, icon: Icon, defaultOpen = true, viewDetailsLabel, onViewDetails, titleColorCls = "text-cyan-400", badge, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-none cursor-pointer text-left"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    {Icon && <Icon size={16} className={`${titleColorCls} flex-shrink-0`} />}
                    <span className={`text-sm sm:text-base font-bold uppercase tracking-wider ${titleColorCls} truncate`}>{title}</span>
                    {viewDetailsLabel && (
                        <span
                            onClick={(e) => { e.stopPropagation(); onViewDetails && onViewDetails(); }}
                            className="text-[11px] font-bold text-slate-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer ml-1 flex-shrink-0"
                        >
                            {viewDetailsLabel}
                        </span>
                    )}
                    {badge && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded tracking-wider flex-shrink-0">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronDown size={18} className="text-slate-500 flex-shrink-0" /> : <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />}
            </button>
            {open && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-800/60">
                    {children}
                </div>
            )}
        </div>
    );
}

function StatusCheckRow({ label, checked, onChange, readOnly = true, optionLabel }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-b-0">
            <span className="text-sm font-bold text-white">{label}</span>
            <label className={`inline-flex items-center gap-2 ${readOnly ? '' : 'cursor-pointer'} select-none`}>
                <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={onChange}
                    readOnly={readOnly}
                    disabled={readOnly}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer disabled:cursor-default"
                />
                {optionLabel && <span className="text-xs font-medium text-slate-300">{optionLabel}</span>}
            </label>
        </div>
    );
}

function Pagination({ currentPage, totalPages, onPageChange, totalEntries, entriesPerPage }) {
    const from = totalEntries > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0;
    const to = Math.min(currentPage * entriesPerPage, totalEntries);
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-slate-700/20 gap-3">
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 cursor-pointer">Previous</button>
                {Array.from({ length: totalPages || 1 }, (_, i) => (
                    <button type="button" key={i + 1} onClick={() => onPageChange(i + 1)} className={`px-3 py-1.5 rounded text-xs border cursor-pointer font-bold transition-all ${currentPage === i + 1 ? 'bg-slate-700 text-white' : 'border-slate-700 bg-transparent text-slate-400'}`}>{i + 1}</button>
                ))}
                <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-transparent text-slate-200 disabled:opacity-30 cursor-pointer">Next</button>
            </div>
            <p className="text-xs text-slate-500">Showing {from}–{to} of {totalEntries} records</p>
        </div>
    );
}

// ─────────────────────────────────────────────
// HOOK – useLeads ENGINE
// ─────────────────────────────────────────────
const JSON_LEAD_FIELDS = [
    'paymentRequests',
    'paymentHistoryDetails',
    'domTransports',
    'domHotels',
    'intHotels',
    'domLocalTransports',
    'flights',
];

function useLeads(triggerNotification) {
    const [leads, setLeads] = useState([]);
    const [isLoading, setLoading] = useState(true);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/leads`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            const parseJSON = (val) => {
                if (!val) return [];
                try {
                    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                    if (Array.isArray(parsed)) return parsed;
                    if (parsed && typeof parsed === 'object') return [parsed]; 
                    return [];
                }
                catch (e) { return []; }
            };

            const mappedData = data.map(lead => ({
                ...lead,
                paymentRequests: parseJSON(lead.paymentRequests),
                paymentHistoryDetails: parseJSON(lead.paymentHistoryDetails),
                domTransports: parseJSON(lead.domTransports),
                domHotels: parseJSON(lead.domHotels),
                intHotels: parseJSON(lead.intHotels),
                domLocalTransports: parseJSON(lead.domLocalTransports),
                flights: parseJSON(lead.flights),
            }));
            
            setLeads(mappedData);
        } catch (err) {
            console.error("Failed to fetch leads for Accounts:", err);
            setLeads([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

    const updateLead = async (id, updatedData) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedData } : l));
        try {
            const payload = { ...updatedData };
            JSON_LEAD_FIELDS.forEach(key => {
                if (payload[key] !== undefined && typeof payload[key] !== 'string') {
                    payload[key] = JSON.stringify(payload[key]);
                }
            });
            await fetch(`${API_BASE_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            triggerNotification('success', 'Accounts ledger updated successfully!');
            fetchLeads();
        } catch (err) {
            triggerNotification('success', 'Accounts changes saved locally.');
        }
    };

    return { leads, isLoading, updateLead, fetchLeads };
}

// ─────────────────────────────────────────────
// BOOKING INSPECTOR MODAL 
// ─────────────────────────────────────────────
function BookingInspectorModal({ lead, onClose, updateLead }) {
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";

    const [transactions, setTransactions] = useState(
        Array.isArray(lead.paymentHistoryDetails) ? lead.paymentHistoryDetails : []
    );
    const [receiptPreview, setReceiptPreview] = useState(null); // { txn, index } — editable copy before printing

    const INDIA_KEYWORDS = ['india','chennai','mumbai','delhi','bangalore','bengaluru','hyderabad','kolkata','pune','goa','kochi','cochin','kerala','jaipur','udaipur','jodhpur','agra','varanasi','rishikesh','manali','shimla','ooty','kodaikanal','munnar','mysore','pondicherry','puducherry','andaman','lakshadweep','kashmir','ladakh','leh','darjeeling','gangtok','sikkim','meghalaya','assam','tamil nadu','karnataka','maharashtra','rajasthan','gujarat','uttarakhand','kanyakumari'];
    const dest = (lead.destination || lead.confirmedDestination || '').toLowerCase();
    const isDomestic = INDIA_KEYWORDS.some(kw => dest.includes(kw));
    const tourTypeLabel = isDomestic ? 'Domestic' : 'International';
    const isInternational = tourTypeLabel === 'International' || String(lead.destinationType).toLowerCase() === 'international';

    const calcDuration = () => {
        const start = lead.tourStartDate || lead.travelDate || lead.travelDates;
        const end = lead.returnDate || lead.tourEndDate;
        if (!start || !end) return lead.duration || lead.confirmedDuration || 'N/A';
        const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
        if (diff > 0) return `${diff} Night${diff > 1 ? 's' : ''} / ${diff + 1} Days`;
        return lead.duration || lead.confirmedDuration || 'N/A';
    };

    const handleToggleVerify = (idx) => {
        const updated = [...transactions];
        updated[idx] = { ...updated[idx], verified: !updated[idx].verified };
        setTransactions(updated);
    };

    const handleOpenReceiptPreview = (txn, idx) => {
        if (!txn.verified) return; // safety guard — button is disabled anyway when unverified
        setReceiptPreview({
            index: idx,
            service: txn.service || '',
            amount: txn.amount || '',
            mode: txn.mode || '',
            transactionId: txn.transactionId || '',
            date: txn.date || '',
            customerName: lead.customerName || lead.profileName || 'Guest',
            customerCity: lead.city || lead.location || lead.customerCity || '',
        });
    };

    const handleSaveVerifications = () => {
        updateLead(lead.id, {
            ...lead,
            paymentHistoryDetails: transactions
        });
        onClose();
    };

    return (
        <div className="flex flex-col w-full min-h-full bg-[#0f172a] text-slate-100 animate-in fade-in duration-200">
            {/* ── HEADER ── */}
            <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0f172a] z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <FileText size={20} className="text-cyan-400 flex-shrink-0" />
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase m-0">
                            Customer Payment
                        </h2>
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            LMN{String(lead.id || '').padStart(4, '0')}
                        </span>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 cursor-pointer border-none bg-transparent">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 w-full relative pb-10">
                <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 w-full">
                    
                    {/* ════════════════════════════════════
                        SECTION 1 — CUSTOMER DETAILS
                    ════════════════════════════════════ */}
                    <CollapsibleSection title="Customer Details" icon={FileText} titleColorCls="text-emerald-400" defaultOpen={true}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3">
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Lead Id</label>
                                <input type="text" readOnly value={`LMN${lead.id}`} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Customer Name</label>
                                <input type="text" readOnly value={lead.customerName || lead.profileName || '—'} className={`${readonlyCls} text-white font-bold`} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Booking Confirmed Date</label>
                                <input type="text" readOnly value={lead.confirmedDate || lead.bookingDate || '—'} className={readonlyCls} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination Type</label>
                                <input type="text" readOnly value={lead.destinationType || tourTypeLabel || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination</label>
                                <input type="text" readOnly value={lead.destination || lead.confirmedDestination || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Duration</label>
                                <input type="text" readOnly value={calcDuration()} className={readonlyCls} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">No. of Pax <span className="lowercase text-slate-600 font-normal">(Adults | Children)</span></label>
                                <input type="text" readOnly value={`${lead.noOfPax || '0'} | ${lead.noOfChildren || lead.confirmedNoOfChildren || '0'}`} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Tour Start Date</label>
                                <input type="text" readOnly value={lead.tourStartDate || lead.travelDate || lead.travelDates || '—'} className={`${readonlyCls} text-red-400`} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Tour End Date</label>
                                <input type="text" readOnly value={lead.tourEndDate || lead.returnDate || '—'} className={`${readonlyCls} text-red-400`} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Sales Executive</label>
                                <input type="text" readOnly value={lead.salesExecutive || lead.assignedTo || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Operations Executive</label>
                                <input type="text" readOnly value={lead.operationsExecutive || lead.operationExecutive || '—'} className={readonlyCls} />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Services</label>
                                <input type="text" readOnly value={lead.confirmedServices || lead.services || '—'} className={readonlyCls} />
                            </div>

                            <div>
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">GST</label>
                                <input type="text" readOnly value={lead.gstInclusion || lead.gstStatus || '—'} className={readonlyCls} />
                            </div>
                            {isInternational && (
                                <div>
                                    <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">TCS</label>
                                    <input type="text" readOnly value={lead.tcsInclusion || lead.tcsStatus || '—'} className={readonlyCls} />
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>

                    {/* ════════════════════════════════════
                        SECTION 2 — SERVICE DETAILS
                    ════════════════════════════════════ */}
                    <CollapsibleSection title="Service Details" icon={DollarSign} titleColorCls="text-cyan-400" defaultOpen={true}>
                        <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg overflow-hidden mt-3">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800/60 text-[11px] uppercase text-slate-300 font-bold">
                                    <tr>
                                        <th className="px-5 py-3 w-[25%]">Service Name</th>
                                        <th className="px-5 py-3">Service Cost</th>
                                        <th className="px-5 py-3">Amount Paid <span className="text-[10px] text-emerald-400 font-normal lowercase ml-1">(verified)</span></th>
                                        <th className="px-5 py-3">Amount Pending</th>
                                        <th className="px-5 py-3 text-center">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {(() => {
                                        const srvsFromConfirmed = lead.confirmedServices ? lead.confirmedServices.split(', ').filter(Boolean) : [];
                                        const srvsFromTxns = transactions.map(t => t.service).filter(Boolean);
                                        const allServices = [...new Set([...srvsFromConfirmed, ...srvsFromTxns])];

                                        if (allServices.length === 0) {
                                            return (
                                                <tr className="hover:bg-slate-800/20">
                                                    <td colSpan="5" className="px-5 py-6 text-center text-slate-500 italic">No services listed</td>
                                                </tr>
                                            );
                                        }
                                        
                                        return allServices.map((s, idx) => {
                                            let costNum = 0;
                                            const sLower = s.toLowerCase();
                                            
                                            if (sLower === 'tour package' || sLower === 'package' || sLower === 'total') {
                                                costNum = Number(String(lead.totalPackageCost || lead.packageCost || lead.budget || lead.amount || '0').replace(/[^0-9.-]+/g,""));
                                            } else {
                                                const originalIndex = srvsFromConfirmed.indexOf(s);
                                                const costsObj = typeof lead.serviceCosts === 'string' ? JSON.parse(lead.serviceCosts || '{}') : (lead.serviceCosts || {});
                                                let costStr = '0';
                                                
                                                if (costsObj[s]) {
                                                    costStr = costsObj[s];
                                                } else if (originalIndex !== -1) {
                                                    costStr = lead[`service${originalIndex + 1}Cost`] || '0';
                                                }
                                                
                                                costNum = Number(String(costStr).replace(/[^0-9.-]+/g,"")) || 0;
                                            }
                                            
                                            const paid = transactions
                                                .filter(t => (t.service || '').toLowerCase() === sLower && t.verified)
                                                .reduce((sum, t) => sum + (Number(String(t.amount).replace(/[^0-9.-]+/g,"")) || 0), 0);
                                                
                                            const pending = costNum - paid;
                                            
                                            return (
                                                <tr key={idx} className="hover:bg-slate-800/30">
                                                    <td className="px-5 py-4 font-bold text-white">{s}</td>
                                                    <td className="px-5 py-4 font-mono text-slate-300">₹{costNum}</td>
                                                    <td className="px-5 py-4 font-mono text-emerald-400">₹{paid}</td>
                                                    <td className="px-5 py-4 font-mono text-orange-400">₹{pending}</td>
                                                    <td className="px-5 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => printServiceInvoice(lead, s, costNum)}
                                                            title="Print / Download Pro-forma Invoice"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 text-xs font-bold cursor-pointer transition-colors"
                                                        >
                                                            <Printer size={13} /> Print
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>

                    {/* ════════════════════════════════════
                        SECTION 3 — TRANSACTION DETAILS
                    ════════════════════════════════════ */}
                    <CollapsibleSection title="Transaction Details" icon={CreditCard} titleColorCls="text-cyan-400" defaultOpen={true}>
                        <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg overflow-x-auto custom-scrollbar mt-3">
                            <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
                                <thead className="bg-slate-800/60 text-[11px] uppercase text-slate-300 font-bold whitespace-nowrap">
                                    <tr>
                                        <th className="px-4 py-3">No.</th>
                                        <th className="px-4 py-3">Service</th>
                                        <th className="px-4 py-3">Amount Received</th>
                                        <th className="px-4 py-3">Payment Mode</th>
                                        <th className="px-4 py-3">Transaction Reference</th>
                                        <th className="px-4 py-3">Payment Date</th>
                                        <th className="px-4 py-3">Attachment</th>
                                        <th className="px-4 py-3 text-center">Verification Status</th>
                                        <th className="px-4 py-3 text-center">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-xs">
                                    {(() => {
                                        if (transactions.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="9" className="px-4 py-6 text-center text-slate-500 italic">No transactions recorded</td>
                                                </tr>
                                            );
                                        }

                                        return transactions.map((txn, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-4 font-bold">{idx + 1}</td>
                                                <td className="px-4 py-4">{txn.service || '—'}</td>
                                                <td className="px-4 py-4 font-mono font-bold text-emerald-400">{txn.amount || '—'}</td>
                                                <td className="px-4 py-4">{txn.mode || '—'}</td>
                                                <td className="px-4 py-4 font-mono text-slate-400">{txn.transactionId || '—'}</td>
                                                <td className="px-4 py-4">{txn.date || '—'}</td>
                                                <td className="px-4 py-4 text-cyan-400 underline cursor-pointer">{txn.attachment ? 'View' : '—'}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none border border-slate-700 bg-slate-900 w-fit px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer" 
                                                            checked={txn.verified || false} 
                                                            onChange={() => handleToggleVerify(idx)}
                                                        />
                                                        <span className={`font-bold ${txn.verified ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                            {txn.verified ? 'Verified' : 'Verify'}
                                                        </span>
                                                    </label>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        disabled={!txn.verified}
                                                        onClick={() => handleOpenReceiptPreview(txn, idx)}
                                                        title={txn.verified ? "Review & Generate Payment Receipt" : "Verify this transaction first to generate a receipt"}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-colors whitespace-nowrap ${
                                                            txn.verified
                                                                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 cursor-pointer'
                                                                : 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-not-allowed opacity-60'
                                                        }`}
                                                    >
                                                        <Printer size={13} /> Generate Receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </CollapsibleSection>

                </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0f172a] z-10 flex justify-end items-center gap-3 flex-shrink-0">
                <button type="button" onClick={onClose} className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1 border-none">
                    Close
                </button>
                <button
                    type="button"
                    onClick={handleSaveVerifications}
                    className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 border-none cursor-pointer text-white text-sm font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                    <CheckSquare size={16} />
                    Save Verifications
                </button>
            </div>

            {/* ── EDITABLE RECEIPT PREVIEW (only reachable for verified transactions) ── */}
            {receiptPreview && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setReceiptPreview(null)}>
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl custom-scrollbar">
                        <div className="sticky top-0 px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] rounded-t-xl">
                            <h3 className="text-base font-bold text-white flex items-center gap-2 m-0">
                                <Printer size={18} className="text-cyan-400 flex-shrink-0" />
                                Review Receipt Before Printing
                            </h3>
                            <button type="button" onClick={() => setReceiptPreview(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer border-none bg-transparent">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer Name</label>
                                    <input type="text" value={receiptPreview.customerName} onChange={e => setReceiptPreview({...receiptPreview, customerName: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer City</label>
                                    <input type="text" value={receiptPreview.customerCity} onChange={e => setReceiptPreview({...receiptPreview, customerCity: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Service</label>
                                    <input type="text" value={receiptPreview.service} onChange={e => setReceiptPreview({...receiptPreview, service: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Amount</label>
                                    <input type="text" value={receiptPreview.amount} onChange={e => setReceiptPreview({...receiptPreview, amount: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Payment Date</label>
                                    <input type="text" value={receiptPreview.date} onChange={e => setReceiptPreview({...receiptPreview, date: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Payment Mode</label>
                                    <input type="text" value={receiptPreview.mode} onChange={e => setReceiptPreview({...receiptPreview, mode: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Transaction Reference</label>
                                    <input type="text" value={receiptPreview.transactionId} onChange={e => setReceiptPreview({...receiptPreview, transactionId: e.target.value})} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-cyan-500" />
                                </div>
                            </div>
                        </div>
                        <div className="sticky bottom-0 px-5 py-4 border-t border-slate-800 bg-[#0b1329] flex justify-end gap-3 rounded-b-xl">
                            <button type="button" onClick={() => setReceiptPreview(null)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm font-semibold cursor-pointer bg-transparent">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    printPaymentReceipt(
                                        { ...lead, customerName: receiptPreview.customerName, customerCity: receiptPreview.customerCity },
                                        { service: receiptPreview.service, amount: receiptPreview.amount, mode: receiptPreview.mode, transactionId: receiptPreview.transactionId, date: receiptPreview.date },
                                        receiptPreview.index
                                    );
                                    setReceiptPreview(null);
                                }}
                                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg cursor-pointer border-none flex items-center gap-2"
                            >
                                <Printer size={15} /> Print / Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// CUSTOMER PAYMENT / TRANSACTION DETAILS POPUP
// ─────────────────────────────────────────────
function CustomerPaymentDetailsModal({ lead, onClose }) {
    if (!lead) return null;
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";
    const txns = Array.isArray(lead.paymentHistoryDetails) ? lead.paymentHistoryDetails : [];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl custom-scrollbar">
                {/* HEADER */}
                <div className="sticky top-0 px-5 sm:px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] rounded-t-xl">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 m-0">
                        <DollarSign size={18} className="text-cyan-400 flex-shrink-0" />
                        Customer Payment
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            LMN{String(lead.id || '').padStart(4, '0')}
                        </span>
                    </h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer border-none bg-transparent">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-5 sm:p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Customer Name</label>
                            <input type="text" readOnly value={lead.customerName || lead.profileName || 'N/A'} className={readonlyCls} />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Paid</label>
                            <input type="text" readOnly value={lead.amountReceived || '0'} className={`${readonlyCls} text-emerald-400`} />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Client Balance</label>
                            <input type="text" readOnly value={lead.balancePending || '0'} className={`${readonlyCls} text-red-400`} />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-3">
                            <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase m-0">Transaction Details</h3>
                       
                        </div>
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded overflow-hidden overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800 text-xs uppercase text-slate-400">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Service</th>
                                        <th className="px-4 py-2">Amount</th>
                                        <th className="px-4 py-2">Mode</th>
                                        <th className="px-4 py-2">Transaction ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {txns.length > 0 ? (
                                        txns.map((hist, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30">
                                                <td className="px-4 py-3">{hist.date || 'TBD'}</td>
                                                <td className="px-4 py-3">{hist.service || 'N/A'}</td>
                                                <td className="px-4 py-3 font-mono">{hist.amount || '0'}</td>
                                                <td className="px-4 py-3">{hist.mode || 'N/A'}</td>
                                                <td className="px-4 py-3 font-mono">{hist.transactionId || 'N/A'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="px-4 py-3">{lead.nextPaymentDate || 'N/A'}</td>
                                            <td className="px-4 py-3">Package</td>
                                            <td className="px-4 py-3 font-mono text-emerald-400">{lead.amountReceived || '0'}</td>
                                            <td className="px-4 py-3">{lead.paymentMode || 'N/A'}</td>
                                            <td className="px-4 py-3 font-mono">{lead.transactionId || 'N/A'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="sticky bottom-0 px-5 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] flex justify-end rounded-b-xl">
                    <button type="button" onClick={onClose}
                        className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 cursor-pointer text-white text-sm font-bold rounded shadow transition-colors uppercase tracking-wider border-none">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AccountsDashboard() {
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const triggerNotification = (type, message) => setNotification({ show: true, type, message });

    useEffect(() => {
        if (notification.show) {
            const t = setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
            return () => clearTimeout(t);
        }
    }, [notification.show]);

    const { leads, isLoading, updateLead } = useLeads(triggerNotification);

    const [activeTab, setActiveTab] = useState('Customer Payment');
    const [searchQuery, setSearchQuery] = useState('');
    const [entriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Modals
    const [selectedLeadForView, setSelectedLeadForView] = useState(null);
    const [selectedLeadForInspect, setSelectedLeadForInspect] = useState(null); // Booking Inspector
    const [selectedPaymentReq, setSelectedPaymentReq] = useState(null);
    const [customerPaymentPopupLead, setCustomerPaymentPopupLead] = useState(null); // Vendor Details "View" popup

    // Filters for "Trip Completed"
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [showScrollTop, setShowScrollTop] = useState(false);
    const mainRef = useRef(null);

    useEffect(() => {
        const el = mainRef.current;
        if (!el) return;
        const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

const confirmedBookings = leads.filter(l => 
        l.status === 'Confirmed Bookings' || 
        l.status === 'Move To Operation' || 
        l.status === 'Upcoming Departure' ||
        l.statusCategory === 'Confirmed' ||
        l.customerResponse === 'Booking Confirmed' ||
        (Array.isArray(l.paymentHistoryDetails) && l.paymentHistoryDetails.length > 0)
    );

    const customerPayments = leads.filter(l =>
        Array.isArray(l.paymentHistoryDetails) && l.paymentHistoryDetails.length > 0
    );

    const getPaymentSummary = (lead) => {
        const txns = Array.isArray(lead.paymentHistoryDetails) ? lead.paymentHistoryDetails : [];
        const totalReceived = txns.reduce((sum, t) => {
            const n = Number(String(t.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
            return sum + n;
        }, 0);
        const lastTxn = txns.length > 0 ? txns[txns.length - 1] : null;
        const verified = txns.length > 0 && txns.every(t => t.verified);
        return {
            totalReceived,
            lastPaymentDate: lastTxn?.date || '—',
            verificationStatus: txns.length === 0 ? 'No Entries' : (verified ? 'Verified' : 'Pending'),
        };
    };

    const getVendorPaymentStatus = (lead) => {
        const reqs = lead.paymentRequests || [];
        if (reqs.length === 0) return 'N/A';
        const allPaid = reqs.every(r => r.status === 'Paid' || r.outAmountPaid);
        return allPaid ? 'Paid' : 'Pending';
    };

    const paymentRequestsList = leads.flatMap(lead => {
        return (lead.paymentRequests || []).map((req, index) => ({
            ...req,
            service: req.service || req.serviceType || req.providerName || 'Vendor Payment',
            reqIndex: index,
            leadId: lead.id,
            customerName: lead.customerName || lead.profileName,
            destination: lead.destination,
            operationsExecutive: lead.assignedTo || 'Operations Team', 
            originalLead: lead
        }));
    }).filter(req => (req.providerName || req.service) && req.amountToPay); 

    const paymentPending = leads.filter(l => {
        if (!l.paymentStatus) return false;
        const status = String(l.paymentStatus).toLowerCase();
        return status !== 'fully paid' && status !== 'cleared' && l.status !== 'New Requests' && l.status !== 'Follow-Up';
    });

    let tripsCompleted = leads.filter(l => 
        l.status === 'Trip Completed' || 
        l.status === 'Trip Closed' || 
        l.status === 'Handover Completed'
    );

    if (filterStartDate && filterEndDate) {
        tripsCompleted = tripsCompleted.filter(l => {
            if (!l.travelDates && !l.travelDate && !l.tourStartDate) return false;
            const tripDate = new Date(l.travelDates || l.travelDate || l.tourStartDate);
            return tripDate >= new Date(filterStartDate) && tripDate <= new Date(filterEndDate);
        });
    }

    const getActiveData = () => {
        switch (activeTab) {
            case 'Customer Payment': return customerPayments;
            case 'Vendor Payment': return paymentRequestsList;
            case 'Confirmed Bookings': return confirmedBookings;
            case 'Client Due': return paymentPending;
            // case 'Trip Completed': return tripsCompleted;
            default: return [];
        }
    };

    const handleTabChange = (tab) => { 
        setActiveTab(tab); 
        setCurrentPage(1); 
        setSearchQuery(''); 
    };

    const activeData = getActiveData();
    const filtered = activeData.filter(item => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return `LMN${item.leadId || item.id}`.toLowerCase().includes(q) || 
               (item.customerName || '').toLowerCase().includes(q) || 
               (item.destination || '').toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    const categories = [
        { id: 'Customer Payment', label: 'Customer Payment', icon: DollarSign, count: customerPayments.length },
        { id: 'Vendor Payment', label: 'Vendor Payment', icon: FileText, count: paymentRequestsList.length },
        { id: 'Confirmed Bookings', label: 'Confirmed Bookings', icon: CheckSquare, count: confirmedBookings.length },
        { id: 'Client Due', label: 'Client Due', icon: AlertCircle, count: paymentPending.length },
        // { id: 'Trip Completed', label: 'Trip Completed', icon: CheckCircle2, count: tripsCompleted.length },
    ];

    const handlePaymentReqOpen = (req) => {
        const alreadyPaid = req.paymentStatus === 'Paid' || req.status === 'Paid';
        setSelectedPaymentReq({
            ...req,
            outService: req.outService || req.service || '',
            outProviderName: req.outProviderName || req.providerName || '',
            outAmountPaid: req.outAmountPaid || (alreadyPaid ? req.amountToPay : '') || '',
            outTransactionMode: req.outTransactionMode || '',
            outDepositedBank: req.outDepositedBank || '',
            outTransactionId: req.outTransactionId || '',
            currency: req.currency || 'INR',
            paymentStatus: req.paymentStatus || (req.status === 'Paid' || req.outAmountPaid ? 'Paid' : 'Yet to Pay'),
            attachment: req.attachment || '',
        });
    };

    const handlePaymentReqUpdate = (e) => {
        e.preventDefault();
        const leadToUpdate = leads.find(l => l.id === selectedPaymentReq.leadId);
        if (!leadToUpdate) return;

        const updatedRequests = [...leadToUpdate.paymentRequests];
        updatedRequests[selectedPaymentReq.reqIndex] = {
            service: selectedPaymentReq.service,
            providerName: selectedPaymentReq.outProviderName || selectedPaymentReq.providerName,
            paymentDueDate: selectedPaymentReq.paymentDueDate,
            serviceCost: selectedPaymentReq.serviceCost,
            paymentType: selectedPaymentReq.paymentType,
            amountToPay: selectedPaymentReq.amountToPay,
            currency: selectedPaymentReq.currency,
            paymentAccountDetails: selectedPaymentReq.paymentAccountDetails,
            dirStatus: selectedPaymentReq.dirStatus, 
            dirRemarks: selectedPaymentReq.dirRemarks,
            outService: selectedPaymentReq.outService,
            outProviderName: selectedPaymentReq.outProviderName,
            outAmountPaid: selectedPaymentReq.outAmountPaid,
            outTransactionMode: selectedPaymentReq.outTransactionMode,
            outDepositedBank: selectedPaymentReq.outDepositedBank,
            outTransactionId: selectedPaymentReq.outTransactionId,
            attachment: selectedPaymentReq.attachment,
            paymentStatus: selectedPaymentReq.paymentStatus,
            status: selectedPaymentReq.paymentStatus === 'Paid' ? 'Paid' : 'Pending'
        };

        updateLead(leadToUpdate.id, {
            ...leadToUpdate,
            paymentRequests: updatedRequests
        });

        setSelectedPaymentReq(null);
    };

    const inputCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none";
    const selectCls = "w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 outline-none cursor-pointer";
    const readonlyCls = "w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none";

    return (
        <div ref={mainRef} className="w-full bg-[#0f172a] min-h-screen font-sans text-white overflow-y-auto relative" style={{ height: '100vh' }}>
            <style>{`.custom-date-input::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer; }`}</style>
            
            {notification.show && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl text-xs font-bold bg-[#0d233e] tracking-wide animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{notification.message}</span>
                </div>
            )}

            {/* CONDITIONAL RENDER: Main Dashboard vs Full-Screen Forms */}
            {!selectedLeadForInspect && !selectedLeadForView && !selectedPaymentReq ? (
                <div className="p-4 sm:p-6">

                    <div className="py-12 mb-0 sm:mb-8">
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Wallet className="text-cyan-500" size={28} /> Accounts Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm sm:text-base mt-1">Manage vendor payment requests, client dues, and finalized trip financials.</p>
                    </div>

                    <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                        {categories.map((cat) => (
                            <div key={cat.id} onClick={() => handleTabChange(cat.id)} className={`relative p-5 rounded-xl cursor-pointer transition-all border ${activeTab === cat.id ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200 hover:bg-slate-800/30'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-3 rounded-lg ${activeTab === cat.id ? 'bg-slate-700 text-cyan-400' : 'bg-slate-800/20 text-slate-300'}`}><cat.icon size={24} /></div>
                                    <span className={`text-xl font-bold ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.count}</span>
                                </div>
                                <h3 className={`font-semibold text-base ${activeTab === cat.id ? 'text-white' : 'text-slate-200'}`}>{cat.label}</h3>
                                {activeTab === cat.id && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-cyan-500" />}
                            </div>
                        ))}
                    </div>

                    <div className="bg-transparent border border-slate-700/30 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between p-4 sm:p-5 border-b border-slate-700/20 gap-3">
                            <div className="flex flex-col">
                                <h2 className="text-base sm:text-lg font-bold text-white">{activeTab} <span className="text-slate-400 font-normal text-sm ml-2">({filtered.length} records)</span></h2>
                                {activeTab === 'Customer Payment' && <span className="text-xs text-slate-500 mt-1 italic">Customer transactions logged against confirmed bookings — verify from the same form used in Confirmed Bookings</span>}
                                {activeTab === 'Confirmed Bookings' && <span className="text-xs text-slate-500 mt-1 italic">Once sales has given "Booking Confirmed"</span>}
                                {activeTab === 'Client Due' && <span className="text-xs text-slate-500 mt-1 italic">Client balance is not 0 or status is not Fully Paid</span>}
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                
                                {activeTab === 'Trip Completed' && (
                                    <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded border border-slate-700">
                                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer" style={{colorScheme: 'dark'}} />
                                        <span className="text-slate-500 text-xs">to</span>
                                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer" style={{colorScheme: 'dark'}} />
                                        {(filterStartDate || filterEndDate) && (
                                            <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="ml-1 text-slate-400 hover:text-red-400"><X size={14}/></button>
                                        )}
                                    </div>
                                )}

                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input type="text" placeholder="Search ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-transparent border border-slate-600 rounded-lg text-slate-100 focus:border-cyan-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-200 min-w-[900px]">
                                <thead className="bg-slate-900/80 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                    
                                    {activeTab === 'Customer Payment' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Amount Received</th>
                                            <th className="px-6 py-4">Payment Date</th>
                                            <th className="px-6 py-4">Sales Executive</th>
                                            <th className="px-6 py-4">Verification Status</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Confirmed Bookings' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Trip Date</th>
                                            <th className="px-6 py-4">Package Cost</th>
                                            <th className="px-6 py-4">Client Payment Status</th>
                                            <th className="px-6 py-4">Vendor Payment Status</th>
                                            <th className="px-6 py-4">Trip Status</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Vendor Payment' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Vendor Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Amount to Pay</th>
                                            <th className="px-6 py-4">Due Date</th>
                                            <th className="px-6 py-4">Operations Exec</th>
                                            <th className="px-6 py-4">Approval Status</th>
                                            <th className="px-6 py-4">Payment Status</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Client Due' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Tour Date</th>
                                            <th className="px-6 py-4">Package Value</th>
                                            <th className="px-6 py-4 text-emerald-400">Amount Received</th>
                                            <th className="px-6 py-4 text-orange-400">Amount Pending</th>
                                            <th className="px-6 py-4">Days Left</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                    {activeTab === 'Trip Completed' && (
                                        <tr>
                                            <th className="px-6 py-4">Lead Id</th>
                                            <th className="px-6 py-4">Customer Name</th>
                                            <th className="px-6 py-4">Destination</th>
                                            <th className="px-6 py-4">Trip Dates</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    )}

                                </thead>
                                <tbody className="divide-y divide-slate-700/20">
                                    {isLoading ? <tr><td colSpan="10" className="px-6 py-12 text-center text-slate-500">Querying accounts records...</td></tr> : paginated.length > 0 ? paginated.map((row, idx) => (
                                        <tr key={`${row.id}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                                            
                                            {activeTab === 'Customer Payment' && (() => {
                                                const summary = getPaymentSummary(row);
                                                return (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                        <td className="px-6 py-4 text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</td>
                                                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">{summary.totalReceived ? `Rs. ${summary.totalReceived.toLocaleString('en-IN')}` : '—'}</td>
                                                        <td className="px-6 py-4">{summary.lastPaymentDate}</td>
                                                        <td className="px-6 py-4 text-slate-300">{row.salesExecutive || row.assignedTo || 'Unassigned'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${summary.verificationStatus === 'Verified' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-orange-950/40 text-orange-400 border-orange-900/40'}`}>
                                                                {summary.verificationStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedLeadForInspect(row)}
                                                                className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full text-xs font-bold"
                                                                title="Open Customer Payment form"
                                                            >
                                                                <Pencil size={14} /> Edit
                                                            </button>
                                                        </td>
                                                    </>
                                                );
                                            })()}

                                            {activeTab === 'Confirmed Bookings' && (() => {
                                                const summary = getPaymentSummary(row);
                                                return (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                        <td className="px-6 py-4 text-emerald-400 flex flex-col gap-0.5">
                                                            <span className="flex items-center gap-1"><MapPin size={12} />{row.destination}</span>
                                                            <span className="text-[10px] text-slate-500 uppercase">{row.tourType || row.packageType}</span>
                                                        </td>
                                                        <td className="px-6 py-4">{row.travelDates || row.travelDate || row.tourStartDate || 'TBD'}</td>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-200">
                                                            {row.totalPackageCost || row.packageCost || row.budget || 'TBD'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${summary.verificationStatus === 'Verified' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-orange-950/40 text-orange-400 border-orange-900/40'}`} title="Called from the Customer Payment form">
                                                                {summary.verificationStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${getVendorPaymentStatus(row) === 'Paid' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-orange-950/40 text-orange-400 border-orange-900/40'}`}>
                                                                {getVendorPaymentStatus(row)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-300">{row.tripStatus || row.status || 'Pending'}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedLeadForInspect(row)}
                                                                className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full text-xs font-bold"
                                                                title="Open Booking Inspector"
                                                            >
                                                                <Eye size={14} /> Inspect
                                                            </button>
                                                        </td>
                                                    </>
                                                );
                                            })()}

                                            {activeTab === 'Vendor Payment' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.leadId}</td>
                                                    <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-cyan-400">{row.providerName || '—'}</span>
                                                            <span className="text-[10px] text-slate-400">{row.service} - {row.paymentType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-orange-400">{row.amountToPay}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-xs font-bold ${new Date(row.paymentDueDate) < new Date() ? 'text-red-400' : 'text-slate-300'}`}>
                                                            {row.paymentDueDate}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">{row.operationsExecutive}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${row.dirStatus === 'Approved' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-slate-800/60 text-slate-400 border-slate-700/40'}`}>
                                                            {row.dirStatus || 'Pending Review'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${(row.status === 'Paid' || row.outAmountPaid) ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' : 'bg-orange-950/40 text-orange-400 border-orange-900/40'}`}>
                                                            {row.status || (row.outAmountPaid ? 'Paid' : 'Pending')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button type="button" onClick={() => handlePaymentReqOpen(row)} className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full text-xs font-bold">
                                                            <Pencil size={14} /> View / Edit
                                                        </button>
                                                    </td>
                                                </>
                                            )}

                                            {activeTab === 'Client Due' && (() => {
                                                const summary = getPaymentSummary(row);
                                                const packageValue = Number(String(row.totalPackageCost || row.packageCost || row.budget || 0).replace(/[^0-9.-]+/g, '')) || 0;
                                                const amountPending = row.balancePending || (packageValue ? Math.max(packageValue - summary.totalReceived, 0) : 'Calculate Manually');
                                                const tourDate = row.tourStartDate || row.travelDate || row.travelDates;
                                                const daysLeft = tourDate && !isNaN(new Date(tourDate)) ? Math.ceil((new Date(tourDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                                return (
                                                    <>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                        <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                        <td className="px-6 py-4 text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</td>
                                                        <td className="px-6 py-4">{tourDate || 'TBD'}</td>
                                                        <td className="px-6 py-4 font-mono text-slate-300">{packageValue ? `Rs. ${packageValue.toLocaleString('en-IN')}` : 'TBD'}</td>
                                                        <td className="px-6 py-4 font-mono font-bold text-emerald-400" title="Called from the Customer Payment form">{summary.totalReceived ? `Rs. ${summary.totalReceived.toLocaleString('en-IN')}` : '—'}</td>
                                                        <td className="px-6 py-4 font-mono font-black text-orange-400">{typeof amountPending === 'number' ? `Rs. ${amountPending.toLocaleString('en-IN')}` : amountPending}</td>
                                                        <td className="px-6 py-4">
                                                            {daysLeft !== null ? (
                                                                <span className={`font-bold ${daysLeft < 7 ? 'text-red-400' : 'text-slate-300'}`}>{daysLeft >= 0 ? `${daysLeft}d` : 'Overdue'}</span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button type="button" onClick={() => setSelectedLeadForInspect(row)} className="text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800 px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full text-xs font-bold" title="Open Customer Payment form">
                                                                <Pencil size={14} /> Edit
                                                            </button>
                                                        </td>
                                                    </>
                                                );
                                            })()}

                                            {activeTab === 'Trip Completed' && (
                                                <>
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-300">LMN{row.id}</td>
                                                    <td className="px-6 py-4 font-bold text-white">{row.customerName}</td>
                                                    <td className="px-6 py-4 text-emerald-400"><MapPin size={12} className="inline mr-1"/>{row.destination}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5 text-xs">
                                                            <span className="text-slate-300">Start: <strong className="text-cyan-400">{row.tourStartDate || row.travelDate || row.travelDates || 'TBD'}</strong></span>
                                                            <span className="text-slate-300">End: <strong className="text-orange-400">{row.returnDate || 'TBD'}</strong></span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button type="button" onClick={() => setSelectedLeadForView(row)} className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer flex items-center justify-center gap-1 w-full" title="View Details">
                                                            <Eye size={16} /> View
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                            
                                        </tr>
                                    )) : <tr><td colSpan="10" className="px-6 py-12 text-center text-slate-500">No records found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalEntries={filtered.length} entriesPerPage={entriesPerPage} />
                    </div>
                </div>

            ) : selectedLeadForInspect ? (
                /* ─── BOOKING INSPECTOR FULL-SCREEN VIEW ──────────────────── */
                <BookingInspectorModal
                    lead={selectedLeadForInspect}
                    onClose={() => setSelectedLeadForInspect(null)}
                    updateLead={updateLead}
                />

            ) : selectedLeadForView ? (
                /* ─── FULL-SCREEN PROFILE VIEW ─────────────────────────── */
                <div className="flex flex-col w-full min-h-full bg-[#0f172a] text-slate-100 animate-in fade-in duration-200">
                    {/* HEADER */}
                    <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0f172a] z-10 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate pr-4">
                                <Eye size={20} className="text-blue-400 flex-shrink-0" />
                                <span className="truncate hidden sm:inline">Profile Inspector</span>
                                <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                    LMN{String(selectedLeadForView.id || '').padStart(4, '0')}
                                </span>
                            </h2>
                        </div>
                        <button type="button" onClick={() => setSelectedLeadForView(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-auto cursor-pointer border-none bg-transparent">
                            <X size={20} />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 w-full relative pb-10">
                        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full max-w-7xl mx-auto">
                            
                            {/* SECTION: SUMMARY */}
                            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm transition-all duration-300">
                                <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-800/60">
                                    <h3 className="text-sm sm:text-base font-bold text-cyan-400 tracking-wider uppercase m-0">
                                        Trip Info & Financials
                                    </h3>
                                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded tracking-wider">Read-Only</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Customer Name</label>
                                        <input type="text" readOnly value={selectedLeadForView.customerName || selectedLeadForView.profileName || 'N/A'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Destination</label>
                                        <input type="text" readOnly value={selectedLeadForView.destination || selectedLeadForView.confirmedDestination || 'N/A'} className="w-full px-3 py-2 bg-[#091124]/50 border border-cyan-900/30 rounded text-cyan-400 font-bold text-sm cursor-not-allowed opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Status</label>
                                        <input type="text" readOnly value={selectedLeadForView.status || selectedLeadForView.rowStatus || 'N/A'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-emerald-400 text-sm uppercase cursor-not-allowed font-bold opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Travel Dates</label>
                                        <input type="text" readOnly value={selectedLeadForView.travelDates || selectedLeadForView.travelDate || selectedLeadForView.tourStartDate || 'TBD'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Total Cost / Budget</label>
                                        <input type="text" readOnly value={selectedLeadForView.totalPackageCost || selectedLeadForView.packageCost || selectedLeadForView.budget || selectedLeadForView.amount || 'N/A'} className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded text-slate-300 font-mono text-sm cursor-not-allowed font-medium opacity-90 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">Balance Pending</label>
                                        <input type="text" readOnly value={selectedLeadForView.balancePending || 'N/A'} className="w-full px-3 py-2 bg-[#091124]/50 border border-red-900/30 rounded text-red-400 font-mono font-bold text-sm cursor-not-allowed opacity-90 focus:outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: HISTORY / NOTES */}
                            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 shadow-sm transition-all duration-300">
                                <h3 className="text-sm sm:text-base font-bold text-cyan-400 tracking-wider uppercase mb-5 pb-2 border-b border-slate-800/60">
                                    History / Notes
                                </h3>
                                <textarea readOnly rows={5} value={Array.isArray(selectedLeadForView.paymentHistoryDetails) 
                                        ? JSON.stringify(selectedLeadForView.paymentHistoryDetails, null, 2) 
                                        : (selectedLeadForView.paymentHistoryDetails || selectedLeadForView.leadMessage || selectedLeadForView.message || 'No additional details recorded.')} className="w-full px-3 py-2 bg-[#07202a] border border-slate-700/30 rounded-lg text-slate-200 text-sm cursor-not-allowed opacity-90 focus:outline-none resize-none custom-scrollbar" />
                            </div>

                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0f172a] z-10 flex justify-end items-center gap-3 flex-shrink-0">
                        <button type="button" onClick={() => setSelectedLeadForView(null)}
                            className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 cursor-pointer text-white text-sm sm:text-base font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider border-none">
                            CLOSE VIEW
                        </button>
                    </div>
                </div>
            ) : selectedPaymentReq ? (
                /* ─── VENDOR PAYMENT FORM (matches Customer Payment full-screen layout) ─── */
                <div className="flex flex-col w-full min-h-full bg-[#0f172a] text-slate-100 animate-in fade-in duration-200">
                    {/* HEADER — mirrors the Customer Payment header: icon + bold uppercase title, X close */}
                    <div className="sticky top-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0f172a] z-10 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <CreditCard size={20} className="text-emerald-400 flex-shrink-0" />
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase m-0">
                                    Vendor Payment
                                </h2>
                                <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                    LMN{selectedPaymentReq.leadId}
                                </span>
                            </div>
                        </div>
                        <button type="button" onClick={() => setSelectedPaymentReq(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 cursor-pointer border-none bg-transparent">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handlePaymentReqUpdate} className="flex flex-col flex-1 w-full relative">
                        {/* CONTENT */}
                        <div className="flex-1 w-full relative pb-10">
                            <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 w-full">

                                {/* TOP INFO GRID */}
                                <CollapsibleSection title="Booking Details" icon={FileText} titleColorCls="text-emerald-400" defaultOpen={true}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3">
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Lead Id</label>
                                            <input type="text" readOnly value={`LMN${selectedPaymentReq.leadId}`} className={readonlyCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Customer Name</label>
                                            <input type="text" readOnly value={selectedPaymentReq.customerName || ''} className={`${readonlyCls} text-white font-bold`} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Booking Confirmed Date</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.confirmedDate || selectedPaymentReq.originalLead?.bookingDate || 'N/A'} className={readonlyCls} />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination Type</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.destinationType || 'N/A'} className={readonlyCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Destination</label>
                                            <input type="text" readOnly value={selectedPaymentReq.destination || ''} className={readonlyCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Duration</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.confirmedDuration || selectedPaymentReq.originalLead?.duration || 'N/A'} className={readonlyCls} />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Tour Start Date</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.tourStartDate || selectedPaymentReq.originalLead?.travelDate || '—'} className={`${readonlyCls} text-red-400`} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Sales Executive</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.salesExecutive || selectedPaymentReq.originalLead?.assignedTo || 'Unassigned'} className={readonlyCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Operations Executive</label>
                                            <input type="text" readOnly value={selectedPaymentReq.operationsExecutive || ''} className={readonlyCls} />
                                        </div>

                                        <div className="sm:col-span-2 md:col-span-3">
                                            <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1.5">Services</label>
                                            <input type="text" readOnly value={selectedPaymentReq.originalLead?.confirmedServices || selectedPaymentReq.originalLead?.services || 'N/A'} className={readonlyCls} />
                                        </div>
                                    </div>
                                </CollapsibleSection>

                                {/* SERVICE DETAILS */}
                                <CollapsibleSection
                                    title="Service Details"
                                    icon={DollarSign}
                                    titleColorCls="text-cyan-400"
                                    defaultOpen={true}
                                    viewDetailsLabel="View Customer Payment"
                                    onViewDetails={() => setCustomerPaymentPopupLead(selectedPaymentReq.originalLead)}
                                >
                                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg overflow-hidden mt-3">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="bg-slate-800/60 text-[11px] uppercase text-slate-300 font-bold">
                                                <tr>
                                                    <th className="px-5 py-3 w-[25%]">Service Name</th>
                                                    <th className="px-5 py-3">Purchase Cost</th>
                                                    <th className="px-5 py-3">Amount Paid</th>
                                                    <th className="px-5 py-3">Amount Pending</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {(() => {
                                                    const confirmedServicesArr = selectedPaymentReq.originalLead?.confirmedServices
                                                        ? selectedPaymentReq.originalLead.confirmedServices.split(', ').filter(Boolean)
                                                        : [];
                                                    if (confirmedServicesArr.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan="4" className="px-5 py-6 text-center text-slate-500 italic">
                                                                    eg. Tour Package, Flights, Travel Insurance — no confirmed services found
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                    return confirmedServicesArr.map((srv, idx) => {
                                                        const purchaseCost = selectedPaymentReq.originalLead?.[`service${idx + 1}Cost`] || '';
                                                        const paid = (selectedPaymentReq.originalLead?.paymentRequests || [])
                                                            .filter(r => (r.service || '').toLowerCase() === srv.toLowerCase())
                                                            .reduce((sum, r) => sum + (Number(String(r.outAmountPaid || 0).replace(/[^0-9.-]+/g, '')) || 0), 0);
                                                        const costNum = Number(String(purchaseCost).replace(/[^0-9.-]+/g, '')) || 0;
                                                        const pending = costNum - paid;
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-800/30">
                                                                <td className="px-5 py-4 font-bold text-white">{srv}</td>
                                                                <td className="px-5 py-4 font-mono text-slate-300">{purchaseCost || 'TBD'}</td>
                                                                <td className="px-5 py-4 font-mono text-emerald-400">{paid ? `Rs. ${paid.toLocaleString('en-IN')}` : '0'}</td>
                                                                <td className="px-5 py-4 font-mono text-orange-400">{pending ? `Rs. ${pending.toLocaleString('en-IN')}` : '0'}</td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </CollapsibleSection>

                                {/* PAYMENT REQUESTS */}
                                <CollapsibleSection title="Payment Requests" icon={CreditCard} titleColorCls="text-cyan-400" defaultOpen={true}>
                                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-lg overflow-x-auto custom-scrollbar mt-3">
                                        <table className="w-full text-left text-sm text-slate-300 min-w-[1100px]">
                                            <thead className="bg-slate-800/60 text-[11px] uppercase text-slate-300 font-bold whitespace-nowrap">
                                                <tr>
                                                    <th className="px-4 py-3">No.</th>
                                                    <th className="px-4 py-3">Vendor Name</th>
                                                    <th className="px-4 py-3">Amount to Pay</th>
                                                    <th className="px-4 py-3">Amount Paid</th>
                                                    <th className="px-4 py-3">Currency</th>
                                                    <th className="px-4 py-3">Payment Due Date</th>
                                                    <th className="px-4 py-3">Payment Status</th>
                                                    <th className="px-4 py-3">Payment Mode</th>
                                                    <th className="px-4 py-3">Transaction Reference</th>
                                                    <th className="px-4 py-3">Bank</th>
                                                    <th className="px-4 py-3">Attachment</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50 text-xs">
                                                <tr className="hover:bg-slate-800/30">
                                                    <td className="px-4 py-4 font-bold">{(selectedPaymentReq.reqIndex ?? 0) + 1}</td>
                                                    <td className="px-4 py-4">
                                                        <input type="text" value={selectedPaymentReq.outProviderName} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outProviderName: e.target.value})} className={inputCls} placeholder="Vendor name" />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input type="text" value={selectedPaymentReq.amountToPay || ''} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, amountToPay: e.target.value})} className={`${inputCls} font-mono text-orange-400`} placeholder="0.00" />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input type="text" value={selectedPaymentReq.outAmountPaid || ''} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outAmountPaid: e.target.value})} className={`${inputCls} font-mono text-emerald-400`} placeholder="0.00" title="Actual amount paid to the vendor — drives Money Out totals" />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <CustomSelect
                                                            value={selectedPaymentReq.currency}
                                                            onChange={v => setSelectedPaymentReq({...selectedPaymentReq, currency: v})}
                                                            className={selectCls}
                                                            placeholder="Currency"
                                                            options={['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <DatePickerField type="date" value={selectedPaymentReq.paymentDueDate || ''} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, paymentDueDate: e.target.value})} className={inputCls} />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none border border-slate-700 bg-slate-900 w-fit px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                                                checked={selectedPaymentReq.paymentStatus === 'Paid'}
                                                                onChange={e => setSelectedPaymentReq({
                                                                    ...selectedPaymentReq,
                                                                    paymentStatus: e.target.checked ? 'Paid' : 'Yet to Pay',
                                                                    outAmountPaid: e.target.checked && !selectedPaymentReq.outAmountPaid ? selectedPaymentReq.amountToPay : selectedPaymentReq.outAmountPaid
                                                                })}
                                                            />
                                                            <span className={`font-bold whitespace-nowrap ${selectedPaymentReq.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                                {selectedPaymentReq.paymentStatus === 'Paid' ? 'Paid' : 'Yet to Pay'}
                                                            </span>
                                                        </label>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <CustomSelect
                                                            value={selectedPaymentReq.outTransactionMode}
                                                            onChange={v => setSelectedPaymentReq({...selectedPaymentReq, outTransactionMode: v})}
                                                            className={selectCls}
                                                            placeholder="Dropdown"
                                                            options={['NEFT', 'RTGS', 'IMPS', 'UPI', 'Credit Card', 'Cash']}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input type="text" value={selectedPaymentReq.outTransactionId} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, outTransactionId: e.target.value})} className={inputCls} placeholder="Reference" />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <CustomSelect
                                                            value={selectedPaymentReq.outDepositedBank}
                                                            onChange={v => setSelectedPaymentReq({...selectedPaymentReq, outDepositedBank: v})}
                                                            className={selectCls}
                                                            placeholder="Dropdown"
                                                            options={['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Other']}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <input type="text" value={selectedPaymentReq.attachment || ''} onChange={e => setSelectedPaymentReq({...selectedPaymentReq, attachment: e.target.value})} className={inputCls} placeholder="Link / file ref" />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </CollapsibleSection>

                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="sticky bottom-0 px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0f172a] z-10 flex justify-end items-center gap-3 flex-shrink-0">
                            <button type="button" onClick={() => setSelectedPaymentReq(null)} className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1 border-none">
                                CANCEL
                            </button>
                            <button type="submit" className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 border-none cursor-pointer text-white text-sm font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider flex items-center justify-center gap-2 order-1 sm:order-2">
                                <CheckSquare size={16} /> SAVE & CLEAR
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            <button type="button" onClick={scrollToTop} aria-label="Scroll to top" className={`fixed bottom-6 right-5 z-40 p-3 rounded-full bg-slate-800 border border-slate-600 text-slate-300 shadow-lg transition-all duration-300 cursor-pointer hover:bg-slate-700 hover:text-white ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <ArrowUp size={18} />
            </button>

            {customerPaymentPopupLead && (
                <CustomerPaymentDetailsModal lead={customerPaymentPopupLead} onClose={() => setCustomerPaymentPopupLead(null)} />
            )}
        </div>
    );
}