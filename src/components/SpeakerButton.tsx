import { useState } from 'react';
import { speak } from '../lib/speech';
import { Speaker, Turtle } from './Icons';

interface Props {
  text: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  slow?: boolean;
  className?: string;
  label?: string;
}

const SIZES = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-16 w-16 rounded-2xl',
  xl: 'h-24 w-24 rounded-3xl',
};
const ICON = { sm: 18, md: 22, lg: 32, xl: 48 };

export default function SpeakerButton({ text, size = 'md', slow = false, className = '', label }: Props) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ?? (slow ? 'Nghe chậm' : 'Nghe phát âm')}
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
        speak(text, { slow, onEnd: () => setPlaying(false) });
        setTimeout(() => setPlaying(false), 4000);
      }}
      className={`btn-3d inline-flex shrink-0 items-center justify-center bg-sky-500 text-white shadow-[0_4px_0_#1899d6] ${SIZES[size]} ${
        playing ? 'animate-pulse' : ''
      } ${className}`}
    >
      {slow ? <Turtle size={ICON[size]} /> : <Speaker size={ICON[size]} />}
    </button>
  );
}
