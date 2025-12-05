import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { RATING_LABELS } from '../constants';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showTooltip = true,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSize = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  const currentRating = hoverValue ?? value;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={`transition-transform duration-100 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } focus:outline-none`}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(null)}
            onClick={() => !readonly && onChange?.(star)}
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`${starSize} ${
                star <= currentRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-100 text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {showTooltip && !readonly && (
        <span className={`text-sm font-medium h-5 transition-colors duration-200 ${currentRating > 0 ? 'text-amber-600' : 'text-transparent'}`}>
          {currentRating > 0 ? RATING_LABELS[currentRating] : 'Select rating'}
        </span>
      )}
    </div>
  );
};