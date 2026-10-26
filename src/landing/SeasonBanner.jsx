import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

function Stars() {
  const stars = Array.from({ length: 46 }, (_, i) => ({
    x: Math.random() * 1600, y: Math.random() * 230, r: Math.random() * 1.3 + 0.4,
    dur: (Math.random() * 3 + 2.5).toFixed(2), delay: (Math.random() * 3).toFixed(2)
  }));
  return (
    <g>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#F6EFC9">
          <animate attributeName="opacity" values="0.15;1;0.15" dur={`${s.dur}s`} begin={`${s.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  );
}

export default function SeasonBanner({ banner, onCta }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });
  const artX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const artY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const photoX = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const photoY = useTransform(sy, [-0.5, 0.5], [-6, 6]);

  function handleMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleLeave() { mx.set(0); my.set(0); }

  const hasPhoto = !!banner.gambar;

  return (
    <section className="season-banner" ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleLeave}>
      {hasPhoto && (
        <motion.img className="season-banner-photo" src={banner.gambar} alt="" style={{ x: photoX, y: photoY, scale: 1.06 }} />
      )}
      <motion.div className="season-banner-art" style={{ x: artX, y: artY, scale: 1.04, opacity: hasPhoto ? 0.18 : 1 }}>
        <svg viewBox="0 0 1600 480" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c1c1b" /><stop offset="55%" stopColor="#282828" /><stop offset="100%" stopColor="#3a3326" />
            </linearGradient>
            <linearGradient id="domeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E6D285" /><stop offset="100%" stopColor="#A98E23" />
            </linearGradient>
          </defs>
          <rect width="1600" height="480" fill="url(#skyGrad)" />
          <Stars />
          <motion.circle cx="1370" cy="90" r="34" fill="#F6EFC9" opacity="0.9"
            animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          <circle cx="1358" cy="82" r="30" fill="#282828" />
          <g fill="#141412">
            <rect x="0" y="330" width="90" height="150" /><rect x="90" y="300" width="40" height="180" />
            <path d="M130 300 a40 40 0 0 1 80 0 v180 h-80 z" /><rect x="210" y="340" width="60" height="140" />
            <rect x="300" y="250" width="26" height="230" /><path d="M300 250 l13 -30 l13 30 z" />
            <path d="M420 290 a110 110 0 0 1 220 0 v190 h-220 z" /><rect x="380" y="330" width="30" height="150" />
            <rect x="650" y="310" width="24" height="170" /><path d="M650 310 l12 -28 l12 28 z" />
            <rect x="720" y="350" width="70" height="130" /><path d="M900 260 a130 130 0 0 1 260 0 v220 h-260 z" />
            <rect x="860" y="300" width="28" height="180" /><path d="M860 300 l14 -32 l14 32 z" />
            <rect x="1190" y="300" width="28" height="180" /><path d="M1190 300 l14 -32 l14 32 z" />
            <rect x="1240" y="340" width="90" height="140" /><rect x="1340" y="310" width="24" height="170" />
            <rect x="1420" y="360" width="180" height="120" /><rect x="1470" y="300" width="26" height="180" />
            <path d="M1470 300 l13 -30 l13 30 z" />
          </g>
          <path d="M420 290 a110 110 0 0 1 220 0 z" fill="url(#domeGrad)" />
          <path d="M900 260 a130 130 0 0 1 260 0 z" fill="url(#domeGrad)" />
        </svg>
      </motion.div>
      <div className="season-banner-rays" />
      <div className="container season-banner-inner">
        <motion.span className="badge-pill season-badge" animate={{ y: [0, -4, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}>
          <span className="badge-pulse" /> {banner.musim}
        </motion.span>
        <h2 className="t-headline-lg season-title">{banner.judul}</h2>
        <p className="lead season-lead">{banner.subjudul}</p>
        <motion.button className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={onCta}>
          Lihat Materi Musim Ini
        </motion.button>
      </div>
      <div className="season-banner-scroll-cue"><span /></div>
    </section>
  );
}
