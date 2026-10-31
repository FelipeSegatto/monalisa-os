import devBeauty from '../assets/images/dev-beauty.png';
import devFiber from '../assets/images/dev-fiber.png';
import devQclean from '../assets/images/dev-qclean.png';
import devUltramed from '../assets/images/dev-ultramed.png';

export interface Device {
  name: string;
  img: string;
}

export const DEVICES: Device[] = [
  { name: 'Beauty Shape Duo', img: devBeauty },
  { name: 'Fiber Evo', img: devFiber },
  { name: 'Laser Q-Clean', img: devQclean },
  { name: 'Ultramed Hifu', img: devUltramed },
];

/** translateZ depths (px) for the 10 cardboard mid-layers, darkest brown. */
export const MID_LAYER_DEPTHS = [1.3, 2.6, 3.9, 5.2, 6.5, 7.8, 9.1, 10.4, 11.7, 13.0];
/** translateZ depth (px) for the lighter cardboard back layer. */
export const BACK_LAYER_DEPTH = 14.3;
