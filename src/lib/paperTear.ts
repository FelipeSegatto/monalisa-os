import paperTexture from '../assets/images/textura-papel.png';

type Side = -1 | 1;
type TearPoint = [x: number, y: number, fiber: number];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function buildTearLine(width: number, height: number): TearPoint[] {
  const pts: TearPoint[] = [];
  let x = width * rnd(0.47, 0.53);

  for (let y = 0; y <= height + 20; y += rnd(10, 26)) {
    x += rnd(-14, 14);
    x = Math.min(width * 0.58, Math.max(width * 0.42, x));
    pts.push([x, Math.min(y, height), rnd(3, 10)]);
  }
  pts[pts.length - 1][1] = height;

  return pts;
}

function polygon(pts: TearPoint[], width: number, height: number, side: Side, inset: boolean): string {
  const edge = pts
    .map(([px, py, fiber]) => `${px + (inset ? (side < 0 ? -fiber : fiber) : 0)}px ${py}px`)
    .join(',');
  return side < 0
    ? `polygon(0 0,${edge},0 ${height}px)`
    : `polygon(${width}px 0,${edge},${width}px ${height}px)`;
}

function buildHalf(side: Side, pts: TearPoint[], width: number, height: number, scrollY: number, root: HTMLElement) {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:300',
    'pointer-events:none',
    `clip-path:${polygon(pts, width, height, side, false)}`,
    `background:#F6F2E8 url(${paperTexture}) 0 0 / 450px 450px`,
    `transform-origin:${side < 0 ? '0% 100%' : '100% 100%'}`,
  ].join(';');

  const inner = document.createElement('div');
  inner.style.cssText = [
    'position:absolute',
    'inset:0',
    'overflow:hidden',
    `clip-path:${polygon(pts, width, height, side, true)}`,
  ].join(';');

  const clone = root.cloneNode(true) as HTMLElement;
  clone.style.cssText = `position:absolute;top:${-scrollY}px;left:0;width:100%`;

  inner.appendChild(clone);
  wrap.appendChild(inner);
  document.body.appendChild(wrap);

  const animation = wrap.animate(
    [
      { transform: 'none', easing: 'cubic-bezier(.2,.7,.3,1)' },
      {
        transform: `translateX(${side * 16}px) rotate(${side * 1.4}deg)`,
        offset: 0.28,
        easing: 'cubic-bezier(.55,0,.8,.2)',
      },
      { transform: `translate(${side * width * 0.8}px, ${height * 0.1}px) rotate(${side * 16}deg)` },
    ],
    { duration: 1150, fill: 'forwards' },
  );
  animation.onfinish = () => wrap.remove();
}

/**
 * Tears the current page in half (ragged paper edge) and flies the two
 * halves off screen, revealing whatever is mounted underneath. Call
 * `onTorn` right after the halves are in the DOM (and about to cover the
 * viewport) to swap in the next page underneath before the reveal starts.
 */
export function tearPage(onTorn: () => void): void {
  const root = document.getElementById('root');
  if (!root) {
    onTorn();
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const scrollY = window.scrollY;
  const pts = buildTearLine(width, height);

  buildHalf(-1, pts, width, height, scrollY, root);
  buildHalf(1, pts, width, height, scrollY, root);

  onTorn();
}
