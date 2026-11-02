import lying from '../assets/images/mulher-deitada-monalisa.png';
import sitting from '../assets/images/bk-sitting2.png';
import cloud from '../assets/images/nuvem-sorrindo-monalisa.svg';
import heart from '../assets/images/coracao-monalisa.svg';
import laser from '../assets/images/homem-musculoso.svg';
import pose from '../assets/images/mulher-pose-monalisa.svg';
import body from '../assets/images/mulher-plus-mona.svg';
import star from '../assets/images/estrela-monalisa.png';
import smile from '../assets/images/carinha-monalisa.png';

export const AVATARS = [
  { id: 'heart', name: 'Coração', image: heart, color: '#FF5179' },
  { id: 'laser', name: 'Musculoso', image: laser, color: '#00C0F2' },
  { id: 'lying', name: 'Deitada', image: lying, color: '#FF5179' },
  { id: 'pose', name: 'Pose', image: pose, color: '#F6B900' },
  { id: 'body', name: 'Curvas', image: body, color: '#8650D8' },
  { id: 'star', name: 'Estrela', image: star, color: '#FF394A' },
  { id: 'sitting', name: 'Sentada', image: sitting, color: '#00C0F2' },
  { id: 'smile', name: 'Carinha', image: smile, color: '#F6B900' },
  { id: 'cloud', name: 'Nuvem', image: cloud, color: '#8650D8' },
] as const;
export type AvatarId = typeof AVATARS[number]['id'];
export const avatarFor = (id: AvatarId) => AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
