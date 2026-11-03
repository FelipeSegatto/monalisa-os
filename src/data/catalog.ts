import depilacaoLaser from '../assets/images/depilacao-a-laser.webp';
import remocaoTatuagem from '../assets/images/remocao-de-tatuagem.webp';
import criolipolise from '../assets/images/criolipolose.webp';
import ultrassomMicrofocado from '../assets/images/ultrassom-microfocado.webp';
import clareamento from '../assets/images/clareamento-intimo.webp';
import peelingCarbono from '../assets/images/peeling-de-carbono.webp';

import detailDepilacao from '../assets/images/depilacao-img.webp';
import detailTatuagem from '../assets/images/remocao-img.webp';
import detailCrio from '../assets/images/criolipolise-img.webp';
import detailUltrassom from '../assets/images/ultrassom-img.webp';
import detailClareamento from '../assets/images/clareamento-img.webp';
import detailPeeling from '../assets/images/peeling-img.webp';

import laserGuy from '../assets/images/homem-musculoso.svg';
import tattooLady from '../assets/images/mulher-pose-monalisa-pb.svg';
import crioLady from '../assets/images/mulher-deitada-monalisa.webp';
import ultrassomMan from '../assets/images/homem-sentado-mona.svg';
import ladyBody from '../assets/images/mulher-plus-mona.svg';
import peelingStar from '../assets/images/estrela-monalisa.webp';

export interface AreaOption {
  name: string;
  /** null = "sob avaliação" (no fixed price, needs a quote). */
  price: number | null;
}

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
  /** Booking flow: areas/options that can be chosen for this procedure, each with its own price; the first is pre-selected. */
  areas: AreaOption[];
}

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    name: 'Depilação a laser',
    price: 'a partir de R$ 50',
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
    areas: [
      { name: 'pernas', price: 300 },
      { name: 'meia perna', price: 190 },
      { name: 'axilas', price: 90 },
      { name: 'virilha', price: 120 },
      { name: 'buço', price: 50 },
      { name: 'barba', price: 90 },
      { name: 'rosto', price: 100 },
      { name: 'braços', price: 200 },
      { name: 'costas', price: 220 },
      { name: 'peitoral', price: 200 },
      { name: 'glúteos', price: 120 },
      { name: 'íntima', price: 100 },
      { name: 'perianal', price: 80 },
    ],
  },
  {
    name: 'Remoção de tatuagem',
    price: 'a partir de R$ 100',
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
    areas: [
      { name: '0 a 5cm', price: 100 },
      { name: '5 a 10cm', price: 190 },
      { name: '10 a 15cm', price: 260 },
      { name: '15 a 20cm', price: 320 },
      { name: '20 a 30cm', price: 380 },
      { name: 'maior que 30cm', price: null },
    ],
  },
  {
    name: 'Ultrassom microfocado',
    price: 'a partir de R$ 600',
    desc: 'Estímulo de colágeno nas camadas profundas da pele, para firmeza e efeito lifting.',
    image: ultrassomMicrofocado,
    bg: '#FF3D7F',
    face: '#8650D8',
    accent: '#F5B800',
    ink: '#161515',
    detailPhoto: detailUltrassom,
    detailBg: '#E65889',
    illus: ultrassomMan,
    illusAR: '1047 / 696',
    titleDiv: 9,
    intro: 'Firmeza que vem de dentro.',
    body: 'Estímulo de colágeno nas camadas profundas da pele, para firmeza e efeito lifting sem procedimentos invasivos.',
    bullets: ['Efeito lifting natural, sem cortes', 'Resultados que evoluem nas semanas seguintes'],
    areas: [
      { name: 'terço superior', price: 600 },
      { name: 'arqueamento de sobrancelhas', price: 600 },
      { name: 'papada', price: 900 },
      { name: 'pescoço', price: 900 },
      { name: 'full face', price: 1600 },
      { name: 'full face e pescoço', price: 2000 },
    ],
  },
  {
    name: 'Criolipólise',
    price: 'a partir de R$ 300',
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
    areas: [
      { name: 'abdômen', price: 300 },
      { name: 'flancos', price: 300 },
      { name: 'culote', price: 300 },
      { name: 'braços', price: 300 },
      { name: 'papada', price: 300 },
      { name: 'costas', price: 300 },
    ],
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
    areas: [{ name: 'rosto', price: 280 }],
  },
  {
    name: 'Clareamento',
    price: 'a partir de R$ 220',
    desc: 'Uniformização de manchas e do tom da pele em axilas, virilha e região íntima.',
    image: clareamento,
    bg: '#3A22E8',
    face: '#FF3B4E',
    accent: '#F5B800',
    ink: '#FEFEFE',
    detailPhoto: detailClareamento,
    illus: ladyBody,
    illusAR: '132 / 329',
    intro: 'Uniformidade sem julgamento.',
    body: 'Uniformização de manchas e do tom da pele em axilas, virilha e região íntima, com acompanhamento dedicado.',
    bullets: ['Protocolo seguro para peles sensíveis', 'Resultado gradual e natural'],
    areas: [
      { name: 'axilas', price: 220 },
      { name: 'virilha', price: 220 },
      { name: 'região íntima', price: 220 },
    ],
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
