import { Arm, Blink, Body, type CharacterProps, line, Svg, thin } from './parts';

const SKIN = '#86d6e2';
const SKIN_DARK = '#58b6c6';
const FOAM = '#ffffff';
const NAVY = '#2c4a7a';

/**
 * Tavi: a huge, kind and funny sea giant with sea-foam beard, a crown of shells, a striped shirt
 * and a magic oar with a star. Original design (not the Polynesian Māui, not Disney's character).
 */
export function Tavi({ size, mood = 'idle', className, title = 'Tavi, uriașul mării' }: CharacterProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <defs>
        <clipPath id="tavi-belly">
          <ellipse cx={100} cy={148} rx={62} ry={46} />
        </clipPath>
      </defs>
      <Body mood={mood}>
        {/* magic oar (behind the right hand) */}
        <g>
          <path d="M150 22 L166 178" stroke="#a9744a" strokeWidth={9} strokeLinecap="round" />
          <path d="M156 150 Q176 160 176 196 Q160 200 152 196 Q148 168 156 150 Z" fill="#c98a55" {...line} />
          <path
            d="M163 166 l3 7 l7 1 l-5 5 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -5 l7 -1 z"
            fill="#ffd166"
            {...thin}
            strokeWidth={2}
          />
          <circle cx={150} cy={22} r={5} fill="#ffd166" />
        </g>
        {/* feet */}
        <ellipse cx={74} cy={190} rx={22} ry={10} fill={SKIN_DARK} {...line} />
        <ellipse cx={126} cy={190} rx={22} ry={10} fill={SKIN_DARK} {...line} />
        {/* big striped belly */}
        <ellipse cx={100} cy={148} rx={62} ry={46} fill="#fff" />
        <g clipPath="url(#tavi-belly)">
          {[108, 124, 140, 156, 172, 188].map((y) => (
            <rect key={y} x={30} y={y} width={140} height={8} fill={NAVY} />
          ))}
        </g>
        <ellipse cx={100} cy={148} rx={62} ry={46} fill="none" {...line} />
        {/* arms */}
        <ellipse cx={42} cy={142} rx={17} ry={28} fill={SKIN} transform="rotate(20 42 142)" {...line} />
        <Arm mood={mood} ox={150} oy={120}>
          <ellipse cx={156} cy={136} rx={17} ry={28} fill={SKIN} transform="rotate(-25 156 136)" {...line} />
          <circle cx={162} cy={156} r={12} fill={SKIN} {...line} />
        </Arm>
        {/* head */}
        <circle cx={56} cy={68} r={12} fill={SKIN} {...line} />
        <circle cx={144} cy={68} r={12} fill={SKIN} {...line} />
        <circle cx={100} cy={66} r={42} fill={SKIN} {...line} />
        {/* sea-foam beard */}
        <path
          d="M62 76 Q58 104 74 116 Q78 128 90 124 Q100 134 110 124 Q122 128 126 116 Q142 104 138 76 Q128 96 100 96 Q72 96 62 76 Z"
          fill={FOAM}
          {...line}
        />
        <path
          d="M80 104 q6 4 10 0 M108 108 q6 4 10 0"
          fill="none"
          stroke="#bfe8ff"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* happy eyes, bushy brows */}
        <Blink cx={100} cy={62}>
          <path d="M78 64 Q85 56 92 64" fill="none" {...line} />
          <path d="M108 64 Q115 56 122 64" fill="none" {...line} />
        </Blink>
        <path
          d="M74 50 q11 -10 22 -2 M104 48 q11 -8 22 2"
          fill="none"
          stroke={FOAM}
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* nose and grin */}
        <ellipse cx={100} cy={76} rx={11} ry={9} fill={SKIN_DARK} {...thin} />
        <path d="M84 88 Q100 102 116 88 Q100 94 84 88 Z" fill="#c8455a" {...thin} />
        {/* crown of shells */}
        <path d="M78 30 l6 -12 l6 12 z" fill="#ffb4a2" {...thin} strokeWidth={2.5} />
        <path d="M94 26 q6 -16 12 0 q-6 4 -12 0z" fill="#ffd6a5" {...thin} strokeWidth={2.5} />
        <path
          d="M114 30 l2 -8 l-6 -4 l8 0 l3 -8 l3 8 l8 0 l-6 4 l2 8 l-7 -5z"
          fill="#ff8a80"
          {...thin}
          strokeWidth={2.5}
        />
      </Body>
    </Svg>
  );
}
