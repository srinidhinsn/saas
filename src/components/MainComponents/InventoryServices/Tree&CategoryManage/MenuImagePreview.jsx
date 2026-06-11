import { useEffect,useRef,useState } from "react";
import axios from "axios";

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

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const url = urlBuilder ? urlBuilder({ baseUrl, clientId, imageId }) : `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`;

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });

        const imageObjectUrl = URL.createObjectURL(response.data);
        setImageSrc(imageObjectUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
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


export default MenuImagePreview