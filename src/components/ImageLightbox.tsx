/**
 * ImageLightbox – zobrazení obrázků jako miniatur s možností zvětšení
 */

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
}

export function ImageLightbox({ images }: ImageLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const handlePrev = () => {
    if (openIndex === null) return;
    setOpenIndex(openIndex > 0 ? openIndex - 1 : images.length - 1);
  };

  const handleNext = () => {
    if (openIndex === null) return;
    setOpenIndex(openIndex < images.length - 1 ? openIndex + 1 : 0);
  };

  return (
    <>
      {/* Miniatury */}
      <div className="flex gap-2 flex-wrap">
        {images.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpenIndex(i); }}
            className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors flex-shrink-0"
          >
            <img src={url} alt={`Příloha ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox dialog */}
      <Dialog open={openIndex !== null} onOpenChange={() => setOpenIndex(null)}>
        <DialogContent className="sm:max-w-3xl p-0 bg-black/95 border-none" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenIndex(null)}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {openIndex !== null && (
            <div className="relative flex items-center justify-center min-h-[400px]">
              <img
                src={images[openIndex]}
                alt={`Příloha ${openIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/60 text-sm">
                {openIndex + 1} / {images.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
