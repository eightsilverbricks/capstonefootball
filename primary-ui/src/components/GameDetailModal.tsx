import React, { useEffect } from 'react';
import { ApiPrediction } from '@/types/prediction';
import { X } from 'lucide-react';
import ClarkReport from './ClarkReport';

interface GameDetailModalProps {
  game: ApiPrediction;
  onClose: () => void;
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({ game, onClose }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Scrollable container */}
      <div className="relative h-full overflow-y-auto flex items-start justify-center p-4 pt-8 pb-16">
        <div className="relative w-full max-w-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <ClarkReport game={game} compact={false} />
        </div>
      </div>
    </div>
  );
};

export default GameDetailModal;
