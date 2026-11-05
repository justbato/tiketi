import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Twitter, Facebook, X } from 'lucide-react';
import { getEventShareUrl } from '../lib/config';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name: string;
    description?: string;
  };
  refCode?: string | null;
}

export function ShareModal({ isOpen, onClose, event, refCode }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = getEventShareUrl(event.id, refCode);
  const shareTitle = event.name;
  const shareText = `Get tickets for ${event.name} on TiKeTi!`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed', err);
        }
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 relative shadow-2xl animate-scale-up"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-accent" style={{ color: 'var(--accent)' }}>
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Share Event</h3>
            <p className="text-xs text-text-muted truncate max-w-[280px]">{event.name}</p>
          </div>
        </div>

        {/* Link copy box */}
        <div className="mb-5">
          <label className="block text-xs font-medium mb-1.5 text-text-secondary">
            Event Link {refCode && <span className="text-accent font-semibold">(Referral active)</span>}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="input text-xs font-mono py-2.5 px-3 flex-1 bg-canvas border rounded-lg truncate select-all"
              style={{ borderColor: 'var(--border)' }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              style={{
                backgroundColor: copied ? 'var(--success)' : 'var(--accent)',
                color: '#FFFFFF'
              }}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Link copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-success mt-1 flex items-center gap-1">
              <Check size={12} /> Link copied to clipboard!
            </p>
          )}
        </div>

        {/* Social Share Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary mb-2">Quick Share</p>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border hover:border-green-500 hover:bg-green-500/10 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                <MessageCircle size={18} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>WhatsApp</span>
            </a>

            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border hover:border-sky-500 hover:bg-sky-500/10 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center">
                <Twitter size={18} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>X / Twitter</span>
            </a>

            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border hover:border-blue-600 hover:bg-blue-600/10 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-600 flex items-center justify-center">
                <Facebook size={18} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Facebook</span>
            </a>
          </div>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="w-full mt-3 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold hover:bg-canvas transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <Share2 size={14} />
              <span>More sharing options (Device Share)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShareButton({
  event,
  refCode,
  size = 'md',
  variant = 'secondary',
  className = '',
}: {
  event: { id: string; name: string; description?: string };
  refCode?: string | null;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setModalOpen(true);
        }}
        className={`neu-button inline-flex items-center gap-1.5 font-medium transition-all ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        } ${variant === 'primary' ? 'neu-button-primary' : ''} ${className}`}
        style={variant === 'outline' ? { border: '1px solid var(--border)' } : undefined}
      >
        <Share2 size={size === 'sm' ? 13 : 15} />
        <span>Share</span>
      </button>

      <ShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={event}
        refCode={refCode}
      />
    </>
  );
}

