import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Printer, Download, Copy, Check } from 'lucide-react';
import { formatDate } from '../lib/data';
import { showToast } from './ui';

// =============================================
// REALISTIC VERTICAL BARCODE SVG
// =============================================
export function VerticalBarcode({ code, height = 110, width = 38 }: { code: string; height?: number; width?: number }) {
  // Generate deterministic bar widths based on code
  const barPattern = [
    3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3
  ];

  const formattedCode = code.length > 14 ? code.slice(0, 14) : code;

  return (
    <div className="flex items-center gap-1.5 select-none shrink-0" style={{ height }}>
      {/* Rotated serial text */}
      <span
        className="font-mono text-[9px] font-bold text-slate-700 tracking-wider"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          letterSpacing: '0.12em',
        }}
      >
        {formattedCode}
      </span>

      {/* Vertical SVG Barcode lines */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {barPattern.map((w, idx) => {
          const x = (idx / barPattern.length) * (width - 4) + 2;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={Math.max(1, w * 0.75)}
              height={height}
              fill="#0F172A"
            />
          );
        })}
      </svg>
    </div>
  );
}

// =============================================
// PALM TREE SVG ICON (MATCHING REFERENCE IMAGE)
// =============================================
export function PalmTreeIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Palm trunk */}
      <path d="M12 22V13C12 11 11.5 8 11.5 8C11.5 8 12.5 11 12.5 13V22H12Z" fill="#0F172A" />
      <path d="M10 22H14V23H10V22Z" fill="#0F172A" />
      {/* Palm fronds */}
      <path d="M12 8C10.5 5 7 4 3 6C5 7.5 7.5 8 11.5 8.5L12 8Z" fill="#0F172A" />
      <path d="M12 8C13.5 5 17 4 21 6C19 7.5 16.5 8 12.5 8.5L12 8Z" fill="#0F172A" />
      <path d="M12 8C9 6.5 6 7 2 11C4.5 10.5 8 10 11.5 9L12 8Z" fill="#0F172A" />
      <path d="M12 8C15 6.5 18 7 22 11C19.5 10.5 16 10 12.5 9L12 8Z" fill="#0F172A" />
      <path d="M12 7.5C11 4.5 10 3 12 1.5C14 3 13 4.5 12 7.5Z" fill="#0F172A" />
    </svg>
  );
}

// =============================================
// HOLOGRAPHIC VALID ENTRY BADGE
// =============================================
export function HologramBadge({ text = "VALID ENTRY" }: { text?: string }) {
  return (
    <div
      className="relative px-2.5 py-1 rounded-[4px] overflow-hidden flex items-center gap-1.5 shadow-sm border border-slate-300"
      style={{
        background: 'linear-gradient(135deg, #e0f2fe 0%, #fef08a 25%, #fbcfe8 50%, #bae6fd 75%, #e9d5ff 100%)',
      }}
    >
      {/* Light sheen reflection overlay */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.9) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
        }}
      />
      {/* Small emblem */}
      <PalmTreeIcon size={12} className="text-slate-700 opacity-60 shrink-0" />
      <span className="font-black text-[10px] tracking-wider text-slate-800 uppercase drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
        {text}
      </span>
    </div>
  );
}

// =============================================
// HOOK: DETECT IMAGE ORIENTATION
// Returns 'landscape' | 'portrait' | null (loading)
// =============================================
function useImageOrientation(src?: string): 'landscape' | 'portrait' | null {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | null>(null);
  useEffect(() => {
    if (!src) { setOrientation('portrait'); return; }
    const img = new Image();
    img.onload = () => {
      setOrientation(img.naturalWidth > img.naturalHeight ? 'landscape' : 'portrait');
    };
    img.onerror = () => setOrientation('portrait');
    img.src = src;
  }, [src]);
  return orientation;
}

// =============================================
// TICKET PASS PROPS
// =============================================
export interface TicketPassProps {
  id: string;
  code: string;
  type: string;
  eventName: string;
  eventVenue?: string;
  eventDate: string;
  buyerName?: string;
  ticketImageUrl?: string;
  admits?: number;
  gender?: 'male' | 'female' | 'any';
  orderRef?: string;
  index?: number;        // 1-based position in the batch
  totalTickets?: number; // total tickets in the batch
  issueDate?: string;    // ISO date when ticket was issued
}

export function TicketPass({
  ticket,
  showActions = true,
}: {
  ticket: TicketPassProps;
  showActions?: boolean;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const partyImage = ticket.ticketImageUrl || '/posters/unifest_concert.jpg';
  const orientation = useImageOrientation(ticket.ticketImageUrl);

  useEffect(() => {
    QRCode.toDataURL(`TIKITI:${ticket.code}`, {
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then(setQrUrl).catch(console.error);
  }, [ticket.code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticket.code);
    setCopied(true);
    showToast('Ticket code copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_${ticket.code}.png`;
    a.click();
    showToast('QR Code downloaded', 'success');
  };

  const ticketNum = ticket.index ?? 1;
  const totalNum = ticket.totalTickets ?? 1;
  const issuedOn = ticket.issueDate
    ? new Date(ticket.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const eventDateDisplay = formatDate(ticket.eventDate).toUpperCase();

  const stubProps = { ticket, qrUrl, ticketNum, totalNum, issuedOn, eventDateDisplay };

  // ——— LANDSCAPE LAYOUT ———
  if (orientation === 'landscape') {
    return (
      <div className="flex flex-col items-center">
        <div
          id={`ticket-pass-${ticket.code}`}
          className="printable-ticket-card w-full max-w-[680px] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-slate-900 transition-all hover:shadow-2xl"
          style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)' }}
        >
          {/* Artwork — wide 16:7 */}
          <div className="px-4 pt-4 pb-0 bg-white">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm" style={{ aspectRatio: '16/7' }}>
              <img src={partyImage} alt={ticket.eventName} className="w-full h-full object-cover" />
              <div className="absolute inset-2.5 rounded-xl border border-white/40 pointer-events-none" />
              {ticket.gender && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-white border border-white/40 shadow-md">
                    {ticket.gender === 'male' ? 'Male Pass' : 'Female Pass'}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Perforation */}
          <div className="relative h-6 flex items-center justify-center bg-white px-3 overflow-hidden">
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--bg-primary)] border-r border-slate-300 z-10" style={{ boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.08)' }} />
            <div className="w-full border-b-2 border-dashed border-slate-300" />
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--bg-primary)] border-l border-slate-300 z-10" style={{ boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.08)' }} />
          </div>
          {/* Stub */}
          <div className="px-4 pb-4 pt-1 bg-white">
            <VerificationStub {...stubProps} layout="horizontal" />
          </div>
        </div>
        {showActions && <ActionButtons copied={copied} onCopy={handleCopy} onDownloadQR={handleDownloadQR} />}
      </div>
    );
  }

  // ——— PORTRAIT LAYOUT (default) ———
  return (
    <div className="flex flex-col items-center">
      <div
        id={`ticket-pass-${ticket.code}`}
        className="printable-ticket-card w-full max-w-[390px] sm:max-w-[420px] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden text-slate-900 transition-all hover:shadow-2xl"
        style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)' }}
      >
        {/* Artwork — 4:5 */}
        <div className="p-3.5 sm:p-4 bg-white">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm flex items-center justify-center aspect-[4/5]">
            <img src={partyImage} alt={ticket.eventName} className="w-full h-full object-cover" />
            <div className="absolute inset-2.5 rounded-xl border border-white/40 pointer-events-none" />
            <div className="absolute inset-3 rounded-lg border border-white/20 pointer-events-none" />
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 pointer-events-none">
              {ticket.gender && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/80 text-white border border-white/40 shadow-md">
                  {ticket.gender === 'male' ? 'Male Pass' : 'Female Pass'}
                </span>
              )}
              {ticket.admits && ticket.admits > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/80 text-white border border-white/40 shadow-md">
                  Admits {ticket.admits}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Perforation */}
        <div className="relative h-6 flex items-center justify-center bg-white px-3 overflow-hidden">
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--bg-primary)] border-r border-slate-300 dark:border-slate-700 z-10" style={{ boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.08)' }} />
          <div className="w-full border-b-2 border-dashed border-slate-300 dark:border-slate-400" />
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--bg-primary)] border-l border-slate-300 dark:border-slate-700 z-10" style={{ boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.08)' }} />
        </div>
        {/* Stub */}
        <div className="p-3.5 sm:p-4 pt-1 bg-white">
          <VerificationStub {...stubProps} layout="vertical" />
        </div>
      </div>
      {showActions && <ActionButtons copied={copied} onCopy={handleCopy} onDownloadQR={handleDownloadQR} />}
    </div>
  );
}

// =============================================
// VERIFICATION STUB
// =============================================
function VerificationStub({
  ticket, qrUrl, ticketNum, totalNum, issuedOn, eventDateDisplay, layout,
}: {
  ticket: TicketPassProps;
  qrUrl: string;
  ticketNum: number;
  totalNum: number;
  issuedOn: string;
  eventDateDisplay: string;
  layout: 'vertical' | 'horizontal';
}) {
  return (
    <div className="border-2 border-slate-900 rounded-xl overflow-hidden bg-white text-slate-900">

      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400 leading-none">TICKET VERIFICATION</p>
          <p className="text-sm font-black uppercase tracking-wide leading-tight mt-0.5">{ticket.type}</p>
        </div>
        {/* Ticket number */}
        <div className="text-right">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">NO.</p>
          <p className="text-2xl font-black leading-none tabular-nums">
            {String(ticketNum).padStart(2, '0')}
            <span className="text-sm font-semibold text-slate-400">/{String(totalNum).padStart(2, '0')}</span>
          </p>
        </div>
      </div>

      {/* BODY */}
      <div className={`p-3 ${layout === 'horizontal' ? 'flex items-start gap-4' : 'space-y-3'}`}>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={`QR ${ticket.code}`}
              className={layout === 'horizontal' ? 'w-[110px] h-[110px] object-contain rounded' : 'w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] object-contain rounded mx-auto'}
            />
          ) : (
            <div className={layout === 'horizontal' ? 'w-[110px] h-[110px] bg-slate-100 animate-pulse rounded' : 'w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] bg-slate-100 animate-pulse rounded mx-auto'} />
          )}
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">SCAN QR</p>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          {/* Event name */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] leading-none">EVENT</p>
            <p className="text-sm font-black uppercase leading-tight text-slate-900 mt-0.5">{ticket.eventName}</p>
          </div>

          {/* Verification code — big & bold */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] leading-none mb-1">VERIFICATION CODE</p>
            <p className="font-mono text-base sm:text-lg font-black tracking-widest text-slate-900 break-all leading-tight">
              {ticket.code}
            </p>
          </div>

          {/* Dates */}
          <div className="flex gap-4">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none">EVENT DATE</p>
              <p className="text-[11px] font-bold text-slate-900 mt-0.5">{eventDateDisplay}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none">ISSUED</p>
              <p className="text-[11px] font-bold text-slate-900 mt-0.5">{issuedOn}</p>
            </div>
          </div>

          {/* Instruction */}
          <div className="flex items-start gap-1.5 pt-0.5">
            <div className="w-1 h-1 rounded-full bg-slate-900 mt-1.5 shrink-0" />
            <p className="text-[10px] text-slate-600 font-medium leading-snug">
              Present this QR or code at the entrance. Non-transferable. One scan per entry.
            </p>
          </div>
        </div>

        {/* Barcode (portrait only) */}
        {layout === 'vertical' && (
          <VerticalBarcode code={ticket.code} height={90} width={28} />
        )}
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 bg-slate-50">
        <HologramBadge text="VALID ENTRY" />
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">NON-TRANSFERABLE · SCAN ON ENTRY</span>
      </div>
    </div>
  );
}

// =============================================
// ACTION BUTTONS
// =============================================
function ActionButtons({
  copied, onCopy, onDownloadQR,
}: { copied: boolean; onCopy: () => void; onDownloadQR: () => void }) {
  return (
    <div className="no-print mt-3 flex items-center justify-center gap-2 flex-wrap">
      <button onClick={onCopy} className="neu-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-text-primary hover:text-accent">
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        <span>{copied ? 'Copied' : 'Copy Code'}</span>
      </button>
      <button onClick={onDownloadQR} className="neu-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-text-primary hover:text-accent">
        <Download size={13} />
        <span>QR Code</span>
      </button>
      <button onClick={() => window.print()} className="neu-button neu-button-primary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-white">
        <Printer size={13} />
        <span>Print Pass</span>
      </button>
    </div>
  );
}
