import depilacaoLaser from '../assets/images/depilacao-a-laser.png';
import remocaoTatuagem from '../assets/images/remocao-de-tatuagem.png';
import criolipolise from '../assets/images/criolipolose.png';
import ultrassomMicrofocado from '../assets/images/ultrassom-microfocado.png';
import clareamento from '../assets/images/clareamento-intimo.png';
import peelingCarbono from '../assets/images/peeling-de-carbono.png';

import detailDepilacao from '../assets/images/depilacao-img.png';
import detailTatuagem from '../assets/images/remocao-img.png';
import detailCrio from '../assets/images/criolipolise-img.png';
import detailUltrassom from '../assets/images/ultrassom-img.png';
import detailClareamento from '../assets/images/clareamento-img.png';
import detailPeeling from '../assets/images/peeling-img.png';

import laserGuy from '../assets/images/homem-musculoso.svg';
import tattooLady from '../assets/images/mulher-pose-monalisa-pb.svg';
import crioLady from '../assets/images/mulher-deitada-monalisa.png';
import ultrassomStar from '../assets/images/carinha-monalisa.png';
import ladyBody from '../assets/images/mulher-plus-mona.svg';
import peelingStar from '../assets/images/estrela-monalisa.png';

export interface CatalogItem {
  name: string;
  price: string;
  desc: string;
  image: string;
  /** Background color of the whole catalog section while this item is active. */
  bg: string;
  /** Fallback background color of the carousel face behind the photo. */
  face: string;
  /** Color of the rough marker highlight behind the title. */
  accent: string;
  /** Text/ink color that reads well against `bg`. */
  ink: string;

  /** Detail page: photo with colored frame + serrated border, already baked in. */
  detailPhoto: string;
  /** Detail page: background override, for when soften(bg) still isn't legible enough. */
  detailBg?: string;
  /** Detail page: line illustration used for the silhouette ring. */
  illus: string;
  /** Detail page: aspect-ratio of `illus`, as a CSS aspect-ratio value. */
  illusAR: string;
  /** Detail page: illustration goes full-width below the photo instead of beside the text. */
  illusWide?: boolean;
  /** Detail page: title font-size divisor override (100cqi / titleDiv). */
  titleDiv?: number;
  /** Detail page: short subtitle under the title. */
  intro: string;
  /** Detail page: paragraph under the intro. */
  body: string;
  /** Detail page: "O que esperar" bullets. */
  bullets: [string, string];
}

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    name: 'Depilação a laser',
    price: 'a partir de R$ 189',
    desc: 'Redução dos pelos com laser, segura para todos os tons de pele.',
    image: depilacaoLaser,
    bg: '#8650D8',
    face: '#FF3D7F',
    accent: '#FF3D7F',
    ink: '#FEFEFE',
    detailPhoto: detailDepilacao,
    illus: laserGuy,
    illusAR: '250 / 369',
    intro: 'Pele livre de pelos, sem desconforto.',
    body: 'Sessões de depilação a laser seguras para todos os tons de pele, com tecnologia que respeita cada tipo de corpo e cada identidade.',
    bullets: ['Resultados visíveis já nas primeiras sessões', 'Atendimento individual, sem julgamentos'],
  },
  {
    name: 'Remoção de tatuagem',
    price: 'a partir de R$ 350',
    desc: 'Clareamento gradual da tinta da tatuagem com laser, em sessões.',
    image: remocaoTatuagem,
    bg: '#FF3B4E',
    face: '#3A22E8',
    accent: '#F5B800',
    ink: '#161515',
    detailPhoto: detailTatuagem,
    detailBg: '#E3555F',
    illus: tattooLady,
    illusAR: '230 / 483',
    intro: 'Nova página, no seu ritmo.',
    body: 'Clareamento gradual da tinta da tatuagem com laser, em sessões espaçadas para preservar a saúde da pele.',
    bullets: ['Avaliação personalizada antes de começar', 'Protocolo indolor e acompanhado de perto'],
  },
  {
    name: 'Ultrassom microfocado',
    price: 'a partir de R$ 1.200',
    desc: 'Estímulo de colágeno nas camadas profundas da pele, para firmeza e efeito lifting.',
    image: ultrassomMicrofocado,
    bg: '#FF3D7F',
    face: '#8650D8',
    accent: '#F5B800',
    ink: '#161515',
    detailPhoto: detailUltrassom,
    detailBg: '#E65889',
    illus: ultrassomStar,
    illusAR: '119 / 136',
    titleDiv: 14,
    intro: 'Firmeza que vem de dentro.',
    body: 'Estímulo de colágeno nas camadas profundas da pele, para firmeza e efeito lifting sem procedimentos invasivos.',
    bullets: ['Efeito lifting natural, sem cortes', 'Resultados que evoluem nas semanas seguintes'],
  },
  {
    name: 'Criolipólise',
    price: 'a partir de R$ 490',
    desc: 'Redução de gordura localizada por resfriamento controlado, sem cortes.',
    image: criolipolise,
    bg: '#EEEEEE',
    face: '#F5B800',
    accent: '#F5B800',
    ink: '#161515',
    detailPhoto: detailCrio,
    illus: crioLady,
    illusAR: '489 / 120',
    illusWide: true,
    intro: 'Gordura localizada, resfriada.',
    body: 'Redução de gordura localizada por resfriamento controlado, sem cortes e sem tempo de recuperação.',
    bullets: ['Sem cirurgia, sem cicatrizes', 'Ideal para áreas resistentes a dieta e exercício'],
  },
  {
    name: 'Peeling de carbono',
    price: 'a partir de R$ 280',
    desc: 'Limpeza profunda com carvão e laser para poros, oleosidade e luminosidade.',
    image: peelingCarbono,
    bg: '#F5B800',
    face: '#FEFEFE',
    accent: '#8650D8',
    ink: '#161515',
    detailPhoto: detailPeeling,
    illus: peelingStar,
    illusAR: '200 / 203',
    titleDiv: 12,
    intro: 'Pele renovada, poro a poro.',
    body: 'Limpeza profunda com carvão e laser para poros, oleosidade e luminosidade da pele.',
    bullets: ['Resultado visível logo na primeira sessão', 'Indicado para peles oleosas e com poros dilatados'],
  },
  {
    name: 'Clareamento',
    price: 'a partir de R$ 220',
    desc: 'Uniformização de manchas e do tom da pele em áreas como axilas, virilha e rosto.',
    image: clareamento,
    bg: '#3A22E8',
    face: '#FF3B4E',
    accent: '#F5B800',
    ink: '#FEFEFE',
    detailPhoto: detailClareamento,
    illus: ladyBody,
    illusAR: '132 / 329',
    intro: 'Uniformidade sem julgamento.',
    body: 'Uniformização de manchas e do tom da pele em áreas como axilas, virilha e rosto, com acompanhamento dedicado.',
    bullets: ['Protocolo seguro para peles sensíveis', 'Resultado gradual e natural'],
  },
];

/** Desaturated variants of a few palette colors, used on the catalog + detail page backgrounds. */
const SOFT: Record<string, string> = {
  '#FF3D7F': '#EE5087',
  '#FF3B4E': '#EC4C58',
  '#3A22E8': '#4434CC',
  '#F5B800': '#E8B82A',
};

export const soften = (hex: string): string => SOFT[hex] ?? hex;
