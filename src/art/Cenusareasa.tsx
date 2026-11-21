import { Arm, Blink, Blush, Body, type CharacterProps, Eye, line, Svg, thin } from './parts';

const SKIN = '#f7d3b7';
const HAIR = '#5b3a2b';
const LILAC = '#cfaef0';
const LILAC_DARK = '#a785d8';
const PEACH = '#ffd2b5';
const RED = '#d9455f';
const NAVY = '#3d4f8f';

/** A small "ie" motif: a rhombus with four dots, red and navy cross-stitch style. */
function Motif({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill={RED} />
      <circle cx={0} cy={-8} r={1.6} fill={NAVY} />
      <circle cx={0} cy={8} r={1.6} fill={NAVY} />
      <circle cx={-8} cy={0} r={1.6} fill={NAVY} />
      <circle cx={8} cy={0} r={1.6} fill={NAVY} />
    </g>
  );
}

/**
 * Cenușăreasa: the public-domain fairy-tale heroine in an ORIGINAL design
 * (lilac and peach gown with Romanian "ie" embroidery, dark brown braid, small tiara, glass slippers).
 */
export function Cenusareasa({ size, mood = 'idle', className, title = 'Cenușăreasa' }: CharacterProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <Body mood={mood}>
        {/* braid behind */}
        {[86, 100, 114, 128].map((y, i) => (
          <ellipse key={y} cx={138 + i * 1.5} cy={y} rx={9} ry={9} fill={HAIR} {...thin} />
        ))}
        <path d="M134 138 l8 6 l8 -6 l-8 -3z" fill={RED} {...thin} strokeWidth={2} />
        {/* skirt */}
        <path d="M84 126 Q58 152 38 190 Q100 204 162 190 Q142 152 116 126 Z" fill={LILAC} {...line} />
        <path d="M92 128 Q84 160 78 194 Q100 198 122 194 Q116 160 108 128 Z" fill={PEACH} {...thin} />
        <Motif x={100} y={150} s={0.9} />
        <Motif x={100} y={176} s={1.1} />
        {[48, 66, 84, 102, 120, 138, 154].map((x) => (
          <circle key={x} cx={x} cy={x < 60 || x > 145 ? 189 : 194} r={4} fill={LILAC_DARK} />
        ))}
        {/* glass slipper peeking out */}
        <path
          d="M110 194 q10 -6 22 -2 q2 6 -6 7 h-16z"
          fill="#d8f3ff"
          opacity={0.95}
          {...thin}
          strokeWidth={2.5}
        />
        {/* bodice */}
        <path d="M80 98 H120 L114 130 H86 Z" fill={LILAC} {...line} />
        <path
          d="M84 104 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4"
          fill="none"
          stroke={RED}
          strokeWidth={2.5}
        />
        {/* arms */}
        <path d="M66 116 Q58 132 62 144" stroke={SKIN} strokeWidth={11} strokeLinecap="round" fill="none" />
        <circle cx={62} cy={146} r={7} fill={SKIN} {...thin} />
        <Arm mood={mood}>
          <path
            d="M134 116 Q142 132 138 144"
            stroke={SKIN}
            strokeWidth={11}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={138} cy={146} r={7} fill={SKIN} {...thin} />
        </Arm>
        {/* puffy ie sleeves with an embroidered band */}
        <ellipse cx={69} cy={108} rx={17} ry={14} fill="#fff" {...line} />
        <ellipse cx={131} cy={108} rx={17} ry={14} fill="#fff" {...line} />
        <path d="M56 113 Q69 119 82 113 M118 113 Q131 119 144 113" fill="none" stroke={RED} strokeWidth={3} />
        <g fill={RED}>
          {[62, 69, 76, 124, 131, 138].map((x) => (
            <circle key={x} cx={x} cy={105} r={1.8} />
          ))}
        </g>
        <g fill={NAVY}>
          {[65.5, 72.5, 127.5, 134.5].map((x) => (
            <circle key={x} cx={x} cy={100} r={1.4} />
          ))}
        </g>
        {/* neck */}
        <rect x={94} y={86} width={12} height={14} rx={4} fill={SKIN} />
        {/* hair back + head */}
        <circle cx={100} cy={56} r={40} fill={HAIR} {...line} />
        <circle cx={100} cy={60} r={33} fill={SKIN} {...line} />
        {/* bangs */}
        <path
          d="M67 54 Q72 24 100 24 Q128 24 133 54 Q120 40 104 44 Q92 34 80 46 Q74 48 67 54 Z"
          fill={HAIR}
          {...thin}
        />
        <Blink>
          <Eye x={87} y={64} r={6.5} iris="#6b3f2a" />
          <Eye x={113} y={64} r={6.5} iris="#6b3f2a" />
        </Blink>
        <path d="M80 54 Q87 50 93 53 M107 53 Q113 50 120 54" fill="none" {...thin} strokeWidth={2.5} />
        <path d="M93 78 Q100 84 107 78" fill="none" {...thin} />
        <Blush x={80} y={74} rx={7} ry={4.5} />
        <Blush x={120} y={74} rx={7} ry={4.5} />
        {/* tiara */}
        <path d="M82 24 L88 14 L94 22 L100 8 L106 22 L112 14 L118 24 Z" fill="#ffd166" {...thin} />
        <circle cx={100} cy={18} r={3.5} fill="#bfe8ff" {...thin} strokeWidth={2} />
      </Body>
    </Svg>
  );
}
