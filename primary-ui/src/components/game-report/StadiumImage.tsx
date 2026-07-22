import React, { useState } from 'react';
import { stadiumImageUrl } from '@/data/stadiumImages';

interface StadiumImageProps {
  /** Home team abbreviation — selects which venue photo to load. */
  homeTeam: string;
  /** Requested image width in px (Wikimedia serves a thumbnail at this size). */
  width?: number;
  /**
   * Accessible alt text for a *content* image (e.g. the venue panel). Omit for a
   * purely decorative background layer — the image is then marked aria-hidden.
   */
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Rendered when there's no photo for this team, or the photo fails to load. */
  fallback?: React.ReactNode;
}

/**
 * A real stadium photograph (Wikimedia Commons, via stadiumImageUrl) with the
 * same onError-fallback contract as PlayerHeadshot/TeamLogo: if the file is
 * missing/renamed or the network fails, it renders `fallback` instead of an
 * empty box — so the honest SVG StadiumScene can stand in seamlessly.
 */
const StadiumImage: React.FC<StadiumImageProps> = ({
  homeTeam, width = 1000, alt, className, style, fallback = null,
}) => {
  const [failed, setFailed] = useState(false);
  const url = stadiumImageUrl(homeTeam, width);

  if (!url || failed) return <>{fallback}</>;

  const decorative = !alt;
  return (
    <img
      src={url}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

export default StadiumImage;
