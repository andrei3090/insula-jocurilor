import { EMOJI, type EmojiName } from './emoji-data';

export type { EmojiName };

/** Fluent Emoji (flat) as inline SVG. Bundled subset only (see tools/emoji.mjs). */
export function Emoji({
  name,
  size = 48,
  className,
  label,
}: {
  name: EmojiName;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static, bundled icon bodies (no user input)
      dangerouslySetInnerHTML={{ __html: EMOJI[name] }}
    />
  );
}

export const emojiSvg = (name: EmojiName) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256">${EMOJI[name]}</svg>`;

export const emojiUrl = (name: EmojiName) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(emojiSvg(name))}`;
