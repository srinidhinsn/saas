import { useEffect,useRef,useState } from "react";
import axios from "axios";

const IMAGE_TTL_MS = 30 * 60 * 1000;
(function purgeOldVersionedKeys() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('img_v')) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch { }
})();
const imageCache = {
  key: (clientId, imageId) => `img_${clientId}_${imageId}`,
  get(clientId, imageId) {
    try {
      const raw = localStorage.getItem(this.key(clientId, imageId));
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() - entry.ts > IMAGE_TTL_MS) { this.remove(clientId, imageId); return null; }
      return entry.data;
    } catch { return null; }
  },
  set(clientId, imageId, base64) {
    try {
      localStorage.setItem(this.key(clientId, imageId), JSON.stringify({ ts: Date.now(), data: base64 }));
    } catch (e) { console.warn('[imageCache] write failed:', e?.name); }
  },
  remove(clientId, imageId) {
    try { localStorage.removeItem(this.key(clientId, imageId)); } catch { }
  },
};
const MenuImagePreview = ({ clientId, imageId, token, alt = "Item image", baseUrl, urlBuilder, className = "" }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const prevImageIdRef = useRef(imageId);
  useEffect(() => {
    if (prevImageIdRef.current === imageId && imageSrc) {
      return;
    }
    prevImageIdRef.current = imageId;
    if (!imageId || !clientId || !token) {
      setLoading(false);
      setError(true);
      return;
    }
    const cached = imageCache.get(clientId, imageId);
    if (cached) {
      setImageSrc(cached);
      setLoading(false);
      return;
    }
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const url = urlBuilder ? urlBuilder({ baseUrl, clientId, imageId }) : `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`;

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });

        const reader = new FileReader();
reader.onloadend = () => {
  const base64 = reader.result;
  imageCache.set(clientId, imageId, base64);
  setImageSrc(base64);
  setLoading(false);
};
reader.readAsDataURL(response.data);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchImage();

    // return () => {
    //   if (imageSrc) {
    //     URL.revokeObjectURL(imageSrc);
    //   }
    // };
  }, [imageId, clientId, token]);

  if (loading) {
    return <div className={`bg-gray-200 animate-pulse ${className}`}></div>;
  }

  if (error || !imageSrc) {
    return (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-xs">+ Add Image</span>
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} className={className} />;
};

export { imageCache };
export default MenuImagePreview
