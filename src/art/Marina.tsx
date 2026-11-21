import { Arm, Blink, Blush, Body, type CharacterProps, Eye, line, Svg, thin } from './parts';

const SKIN = '#c98b5e';
const HAIR = '#2f1e18';
const TEAL = '#2bb3a3';
const CORAL = '#ff7b6b';

const star = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ') + 'Z';

/** Marina: a little sea-voyager with two hair buns, a sun clip, a sailor top and a star compass. Original design. */
export function Marina({
  size,
  mood = 'idle',
  className,
  title = 'Marina, mica navigatoare',
}: CharacterProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <Body mood={mood}>
        {/* legs and sandals */}
        <rect x={82} y={168} width={12} height={20} rx={5} fill={SKIN} {...thin} />
        <rect x={106} y={168} width={12} height={20} rx={5} fill={SKIN} {...thin} />
        <ellipse cx={86} cy={190} rx={12} ry={6} fill="#ffd166" {...thin} />
        <ellipse cx={114} cy={190} rx={12} ry={6} fill="#ffd166" {...thin} />
        {/* skirt with a wave */}
        <path d="M74 146 L64 176 Q100 186 136 176 L126 146 Z" fill={CORAL} {...line} />
        <path
          d="M70 168 q8 -6 15 0 t15 0 t15 0 t15 0"
          fill="none"
          stroke="#fff"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* top */}
        <path d="M78 104 H122 L128 150 H72 Z" fill={TEAL} {...line} />
        <path d="M82 104 L100 126 L118 104" fill="#fff" {...thin} />
        <path d="M88 108 L100 122 L112 108" fill="none" stroke={TEAL} strokeWidth={2.5} />
        <path d={star(100, 136, 8)} fill="#ffd166" {...thin} strokeWidth={2} />
        {/* left arm holding a star compass */}
        <path d="M76 110 Q62 126 64 142" stroke={SKIN} strokeWidth={12} strokeLinecap="round" fill="none" />
        <circle cx={62} cy={150} r={13} fill="#ffe08a" {...thin} />
        <path d={star(62, 150, 8)} fill="#ff9f43" />
        <Arm mood={mood} ox={124} oy={110}>
          <path
            d="M124 110 Q138 126 136 142"
            stroke={SKIN}
            strokeWidth={12}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={136} cy={146} r={7} fill={SKIN} {...thin} />
        </Arm>
        {/* neck */}
        <rect x={94} y={92} width={12} height={14} rx={4} fill={SKIN} />
        {/* hair buns + head */}
        <circle cx={66} cy={34} r={17} fill={HAIR} {...line} />
        <circle cx={134} cy={34} r={17} fill={HAIR} {...line} />
        <circle cx={100} cy={64} r={40} fill={HAIR} {...line} />
        <circle cx={100} cy={68} r={33} fill={SKIN} {...line} />
        <path
          d="M67 62 Q70 30 100 30 Q130 30 133 62 Q124 48 110 50 Q100 40 88 50 Q76 48 67 62 Z"
          fill={HAIR}
        />
        {/* sun hair clip */}
        <g transform="translate(126 44)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d={`M0 0 L${(Math.cos((a * Math.PI) / 180) * 12).toFixed(1)} ${(Math.sin((a * Math.PI) / 180) * 12).toFixed(1)}`}
              stroke="#ffb703"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
          <circle r={7} fill="#ffd166" {...thin} strokeWidth={2.5} />
        </g>
        <Blink cx={100} cy={72}>
          <Eye x={87} y={72} r={6.5} iris="#3a2418" />
          <Eye x={113} y={72} r={6.5} iris="#3a2418" />
        </Blink>
        <path d="M91 84 Q100 94 109 84 Z" fill="#c8455a" {...thin} strokeWidth={2.5} />
        <Blush x={80} y={82} rx={7} ry={4.5} />
        <Blush x={120} y={82} rx={7} ry={4.5} />
        {/* freckles */}
        <g fill="#9a6040">
          <circle cx={83} cy={79} r={1.2} />
          <circle cx={78} cy={81} r={1.2} />
          <circle cx={117} cy={79} r={1.2} />
          <circle cx={122} cy={81} r={1.2} />
        </g>
      </Body>
    </Svg>
  );
}
