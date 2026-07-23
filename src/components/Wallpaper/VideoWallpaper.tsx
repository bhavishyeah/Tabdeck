import { useEffect, useState } from 'react';
import { getVideoBlob } from '../../lib/videoStorage';

interface Props {
  videoKey: string | null;
}

export function VideoWallpaper({ videoKey }: Props) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoKey) {
      setVideoUrl(null);
      return;
    }

    let objectUrl: string | null = null;

    getVideoBlob(videoKey)
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setVideoUrl(objectUrl);
        }
      })
      .catch(() => setVideoUrl(null));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoKey]);

  if (!videoUrl) return null;

  return (
    <video
      className="td-video-wallpaper"
      src={videoUrl}
      autoPlay
      loop
      muted
      playsInline
    />
  );
}
