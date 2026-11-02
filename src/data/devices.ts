import devUltramedCardboard from '../assets/images/dev-ultramed-cardboard.png';
import devUltramedCore from '../assets/images/dev-ultramed-core.png';
import devQcleanCardboard from '../assets/images/dev-qclean-cardboard.png';
import devQcleanCore from '../assets/images/dev-qclean-core.png';
import devFiberCardboard from '../assets/images/dev-fiber-cardboard.png';
import devFiberCore from '../assets/images/dev-fiber-core.png';
import devBeautyCardboard from '../assets/images/dev-beauty-cardboard.png';
import devBeautyCore from '../assets/images/dev-beauty-core.png';
import devBeauty from '../assets/images/dev-beauty.png';
import devFiber from '../assets/images/dev-fiber.png';
import devQclean from '../assets/images/dev-qclean.png';
import devUltramed from '../assets/images/dev-ultramed.png';

export interface Device {
  name: string;
  img: string;
  cardboard: string;
  core: string;
  tipTitle: string;
  tipText: string;
}

export const DEVICES: Device[] = [
  {
    name: 'Beauty Shape Duo',
    img: devBeauty,
    cardboard: devBeautyCardboard,
    core: devBeautyCore,
    tipTitle: 'Beauty Shape Duo',
    tipText:
      'Tecnologia de congelamento do tecido adiposo que ajuda a reduzir a gordura localizada e definir o contorno corporal, sem cirurgia.',
  },
  {
    name: 'Fiber Evo',
    img: devFiber,
    cardboard: devFiberCardboard,
    core: devFiberCore,
    tipTitle: 'Fiber Evo',
    tipText:
      'Laser que atua nos folículos para reduzir os pelos progressivamente. Menos pelos encravados e mais praticidade na rotina.',
  },
  {
    name: 'Laser Q-Clean',
    img: devQclean,
    cardboard: devQcleanCardboard,
    core: devQcleanCore,
    tipTitle: 'Q-Clean',
    tipText: 'Para quem quer clarear uma tatuagem ou cuidar da aparência de manchas, poros e oleosidade.',
  },
  {
    name: 'Ultramed Hifu',
    img: devUltramed,
    cardboard: devUltramedCardboard,
    core: devUltramedCore,
    tipTitle: 'Ultramed Hifu',
    tipText: 'Estimula o colágeno para melhorar a firmeza e suavizar a flacidez, sem cortes.',
  },
];

/** Speech-bubble colors/tilt per device index, Monalisa card style. */
export const TIP_STYLES = [
  { bg: '#FF3D7F', color: '#161515', rotate: -3 },
  { bg: '#FEFEFE', color: '#161515', rotate: 2 },
  { bg: '#FF394A', color: '#161515', rotate: -2 },
  { bg: '#2F1CFF', color: '#FEFEFE', rotate: 3 },
];

/** translateZ depths (px) for the 10 cardboard mid-layers, darkest brown. */
export const MID_LAYER_DEPTHS = [1.3, 2.6, 3.9, 5.2, 6.5, 7.8, 9.1, 10.4, 11.7, 13.0];
/** translateZ depth (px) for the lighter cardboard back layer. */
export const BACK_LAYER_DEPTH = 14.3;
