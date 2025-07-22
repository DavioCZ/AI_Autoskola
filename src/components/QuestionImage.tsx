import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

export const QuestionImage = ({ src }: { src: string }) => (
  <Zoom>
    <img
      src={src}
      alt="Obrázek k otázce"
      className="w-full h-auto rounded-lg mb-4 object-contain
                 cursor-zoom-in select-none"
      style={{ imageRendering: 'pixelated' }} // udrží „ostré“ pixely
    />
  </Zoom>
);
