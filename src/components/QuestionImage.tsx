import { useState, useEffect } from 'react';

export const QuestionImage = ({ src }: { src: string }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
  }, [src]);

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <img
      src={src}
      alt="Obrázek k otázce"
      className={`block mx-auto rounded-lg mb-4 object-contain select-none transition-all duration-300 ${
        isZoomed
          ? 'w-full cursor-zoom-out'
          : 'max-w-full md:max-w-md cursor-zoom-in'
      }`}
      style={{ imageRendering: 'pixelated' }} // udrží „ostré“ pixely
      onClick={handleImageClick}
    />
  );
};
