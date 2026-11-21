import { Arm, Blink, Blush, Body, type CharacterProps, Eye, line, Svg, thin } from './parts';

const FUR = '#bd8552';
const FUR_DARK = '#93603a';
const MUZZLE = '#f4d4ab';
const GREEN = '#5aa83a';

/** Bruno: a brown bear cub explorer with an explorer hat, backpack straps and a lantern. Original design. */
export function Bruno({
  size,
  mood = 'idle',
  className,
  title = 'Bruno, ursulețul explorator',
}: CharacterProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <Body mood={mood}>
        <ellipse cx={73} cy={186} rx={20} ry={11} fill={FUR_DARK} {...line} />
        <ellipse cx={127} cy={186} rx={20} ry={11} fill={FUR_DARK} {...line} />
        <ellipse cx={100} cy={150} rx={47} ry={40} fill={FUR} {...line} />
        <ellipse cx={100} cy={157} rx={28} ry={24} fill={MUZZLE} />
        {/* backpack straps */}
        <path d="M74 118 L80 172" stroke={GREEN} strokeWidth={11} strokeLinecap="round" />
        <path d="M126 118 L120 172" stroke={GREEN} strokeWidth={11} strokeLinecap="round" />
        <circle cx={78} cy={146} r={4} fill="#ffd166" {...thin} strokeWidth={2} />
        <circle cx={122} cy={146} r={4} fill="#ffd166" {...thin} strokeWidth={2} />
        {/* left arm with lantern */}
        <ellipse cx={56} cy={150} rx={14} ry={24} fill={FUR} transform="rotate(16 56 150)" {...line} />
        <g transform="translate(40 166)">
          <circle cx={0} cy={18} r={20} fill="#ffd166" opacity={0.35} />
          <path d="M-7 4 Q0 -6 7 4" fill="none" {...thin} />
          <rect x={-10} y={4} width={20} height={26} rx={6} fill="#ffe08a" {...thin} />
          <path d="M-10 12 H10 M-10 22 H10" {...thin} strokeWidth={2} />
          <circle cx={0} cy={17} r={4} fill="#ff9f43" />
        </g>
        <Arm mood={mood} ox={140} oy={130}>
          <ellipse cx={144} cy={150} rx={14} ry={24} fill={FUR} transform="rotate(-16 144 150)" {...line} />
        </Arm>
        {/* ears */}
        <circle cx={55} cy={48} r={18} fill={FUR} {...line} />
        <circle cx={55} cy={48} r={9} fill="#eab48a" />
        <circle cx={145} cy={48} r={18} fill={FUR} {...line} />
        <circle cx={145} cy={48} r={9} fill="#eab48a" />
        {/* head */}
        <circle cx={100} cy={86} r={52} fill={FUR} {...line} />
        <ellipse cx={100} cy={106} rx={26} ry={19} fill={MUZZLE} {...thin} />
        <Blink cx={100} cy={82}>
          <Eye x={79} y={82} r={7.5} />
          <Eye x={121} y={82} r={7.5} />
        </Blink>
        <path d="M70 68 q8 -6 16 -2 M114 66 q8 -4 16 2" fill="none" {...thin} />
        <ellipse cx={100} cy={97} rx={9} ry={6.5} fill="#3b2a4a" />
        <circle cx={97} cy={95} r={2} fill="#fff" />
        <path d="M100 103 V108 M90 108 Q100 117 110 108" fill="none" {...thin} />
        <Blush x={68} y={104} />
        <Blush x={132} y={104} />
        {/* explorer hat */}
        <ellipse cx={100} cy={42} rx={48} ry={10} fill="#d9b26f" {...line} />
        <path d="M70 41 Q70 12 100 12 Q130 12 130 41 Z" fill="#e6c27f" {...line} />
        <path d="M71 34 H129" stroke={GREEN} strokeWidth={7} />
      </Body>
    </Svg>
  );
}
