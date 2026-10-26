import { useEffect, useRef } from 'react';
// The supplied background is a JPEG, so keep the matching extension
import background from '../../../assets/images/patient/pain-assessment/pain-texture-background.jpg';

// Keep the seven effects lightweight; animate at 30 fps
function drawEffects(ctx, width, height, time, selected, still) {
  ctx.clearRect(0, 0, width, height);
  const x = width * .57,
    y = height * .46,
    unit = Math.min(width, height);
  const wave = (radius, color, alpha = .35, dx = 0) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1, unit * .004);
    ctx.ellipse(x + dx, y, radius, radius * .78, -.35, 0, Math.PI * 2);
    ctx.stroke();
  };
  const glow = (color, radius, alpha) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  ctx.save();
  // Soften overlapping effects so they do not hide the body
  const strength = 1 / Math.max(1, Math.sqrt(selected.length));
  for (const type of selected) {
    const phase = still ? .4 : time;
    ctx.globalAlpha = .65 * strength;
    if (type === 'aching') {
      for (let i = 0; i < 3; i++) wave(unit * (.07 + (phase * .09 + i / 3) % 1 * .29), '#69e4d2', .5 * strength);
    } else if (type === 'stiffness') {
      ctx.strokeStyle = '#d1eee2';
      ctx.lineWidth = unit * .004;
      for (let i = 0; i < 6; i++) {
        const offset = Math.sin(phase * .55 + i) * unit * .009;
        ctx.beginPath();
        ctx.moveTo(x - unit * .16 + i * unit * .05 + offset, y - unit * .17);
        ctx.lineTo(x - unit * .21 + i * unit * .05 + offset, y + unit * .2);
        ctx.stroke();
      }
    } else if (type === 'sharp') {
      // Pulse gently every four seconds; avoid sudden flashes
      const pulse = still ? .55 : Math.pow((Math.cos(phase * Math.PI / 2) + 1) / 2, 4);
      glow('#ffc184', unit * .24, (.12 + pulse * .5) * strength);
      ctx.globalAlpha = (.15 + pulse * .6) * strength;
      ctx.strokeStyle = '#ffba86';
      ctx.lineWidth = unit * .006;
      ctx.beginPath();
      ctx.moveTo(x - unit * .13, y + unit * .06);
      ctx.lineTo(x - unit * .03, y - unit * .04);
      ctx.lineTo(x + unit * .02, y + unit * .08);
      ctx.lineTo(x + unit * .08, y - unit * .13);
      ctx.stroke();
    } else if (type === 'burning') {
      glow('#ff9f63', unit * .35, (.42 + Math.sin(phase * .8) * .16) * strength);
    } else if (type === 'tingling') {
      ctx.fillStyle = '#e2c5ff';
      for (let i = 0; i < 12; i++) {
        ctx.globalAlpha = (.3 + (Math.sin(phase * 1.1 + i * 2) + 1) * .25) * strength;
        ctx.beginPath();
        ctx.arc(x + Math.sin(i * 7) * unit * .23, y + Math.cos(i * 3) * unit * .22, unit * .005, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'movement') {
      for (let i = 0; i < 3; i++) wave(unit * (.08 + i * .065), '#8af5e6', .42 * strength, Math.sin(phase * .7) * unit * .09);
    } else if (type === 'other') glow('#94d8cf', unit * .3, (.3 + Math.sin(phase * .45) * .08) * strength);
  }
  ctx.restore();
}

export default function PainTexture({ selected, preview, onPreview, t }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0,
      visible = true,
      width = 0,
      height = 0,
      last = -Infinity;
    const start = performance.now();
    const render = now => {
      raf = 0;
      // Pause drawing when the tab is hidden or the canvas is off screen
      if (document.hidden || !visible) return;
      if (now - last >= 1000 / 30 || motion.matches) {
        drawEffects(ctx, width, height, (now - start) / 1000, selected, motion.matches);
        last = now;
      }
      // Reduced motion keeps a still preview instead of a running animation
      if (!motion.matches && selected.length) raf = requestAnimationFrame(render);
    };
    const resume = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      render(performance.now());
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      // Keep the canvas sharp on dense screens without making it too large
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resume();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      resume();
    });
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', resume);
    motion.addEventListener('change', resume);
    resize();
    return () => {
      // Remove the old animation and listeners before selections change or we leave
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', resume);
      motion.removeEventListener('change', resume);
    };
  }, [selected]);
  return <div className="pain-texture-wrap">
    <div className="pain-texture">
      <img src={background} width="1536" height="1152" alt="" />
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="pain-texture-chips" aria-label={t('selectedDescriptions')}>
        {selected.map(id => <button key={id} type="button" aria-pressed={preview === id} onClick={() => onPreview(id)}>
          {t(`description.${id}`)}
        </button>)}
      </div>
      <div className="pain-texture-preview" aria-live="polite">
        <strong>
          {preview ? t(`description.${preview}`) : t('textureTitle')}
        </strong>
        <p>
          {preview ? t(`preview.${preview}`) : t('textureHelp')}
        </p>
      </div>
    </div>
    <p className="pain-caption">{t('illustrationNote')}</p>
  </div>;
}
