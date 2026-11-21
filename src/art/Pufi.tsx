import { Arm, Blink, Blush, Body, type CharacterProps, Eye, line, Svg, thin } from './parts';

const DARK = '#3d3549';
const WHITE = '#ffffff';

/** Pufi: a baby panda girl with a pink flower, the voice of the app. Original design. */
export function Pufi({ size, mood = 'idle', className, title = 'Pufi, ursulețul panda' }: CharacterProps) {
  return (
    <Svg size={size} className={className} title={title}>
      <Body mood={mood}>
        {/* feet */}
        <ellipse cx={72} cy={186} rx={21} ry={11} fill={DARK} {...line} />
        <ellipse cx={128} cy={186} rx={21} ry={11} fill={DARK} {...line} />
        {/* body */}
        <ellipse cx={100} cy={150} rx={50} ry={40} fill={WHITE} {...line} />
        <ellipse cx={100} cy={158} rx={24} ry={20} fill="#f4f1f8" />
        {/* left arm */}
        <ellipse cx={55} cy={150} rx={14} ry={25} fill={DARK} transform="rotate(18 55 150)" {...line} />
        {/* right arm (waves) */}
        <Arm mood={mood} ox={140} oy={130}>
          <ellipse cx={145} cy={150} rx={14} ry={25} fill={DARK} transform="rotate(-18 145 150)" {...line} />
        </Arm>
        {/* ears */}
        <circle cx={54} cy={40} r={19} fill={DARK} {...line} />
        <circle cx={146} cy={40} r={19} fill={DARK} {...line} />
        {/* head */}
        <circle cx={100} cy={84} r={56} fill={WHITE} {...line} />
        {/* eye patches */}
        <ellipse cx={77} cy={88} rx={15} ry={19} fill={DARK} transform="rotate(28 77 88)" />
        <ellipse cx={123} cy={88} rx={15} ry={19} fill={DARK} transform="rotate(-28 123 88)" />
        <Blink cx={100} cy={86}>
          <circle cx={79} cy={86} r={9} fill={WHITE} />
          <circle cx={121} cy={86} r={9} fill={WHITE} />
          <Eye x={80} y={87} r={6} />
          <Eye x={120} y={87} r={6} />
        </Blink>
        {/* nose and smile */}
        <path d="M92 103 Q100 97 108 103 Q100 112 92 103 Z" fill={DARK} />
        <path d="M90 113 Q100 123 110 113" fill="none" {...thin} />
        <Blush x={64} y={110} />
        <Blush x={136} y={110} />
        {/* pink flower behind the right ear */}
        <g transform="translate(146 50)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={Math.cos((a * Math.PI) / 180) * 9}
              cy={Math.sin((a * Math.PI) / 180) * 9}
              r={8}
              fill="#ff8fb8"
              {...thin}
              strokeWidth={2.5}
            />
          ))}
          <circle r={5.5} fill="#ffd166" {...thin} strokeWidth={2.5} />
        </g>
      </Body>
    </Svg>
  );
}
