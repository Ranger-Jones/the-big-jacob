import { Alegreya_Sans, Cinzel, Fredoka, Grenze_Gotisch } from 'next/font/google';

export const display = Grenze_Gotisch({ variable: '--font-grenze', subsets: ['latin'], weight: ['500', '600', '700', '800'] });
export const body = Alegreya_Sans({ variable: '--font-alegreya', subsets: ['latin'], weight: ['400', '500', '700', '800'] });
export const classic = Cinzel({ variable: '--font-cinzel', subsets: ['latin'], weight: ['600', '700'] });
export const playful = Fredoka({ variable: '--font-fredoka', subsets: ['latin'], weight: ['500', '600'] });

export const fontVariables = [display, body, classic, playful].map((f) => f.variable).join(' ');
