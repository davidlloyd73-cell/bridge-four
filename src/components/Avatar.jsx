import './Avatar.css';

const COLORS = [
  'var(--color-terracotta)',
  'var(--color-sage)',
  'var(--color-sky)',
  'var(--color-rose)',
  'var(--color-gold)',
  'var(--color-purple)',
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name, photo, size = 48 }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (photo) {
    return (
      <img
        className="avatar"
        src={photo}
        alt={name}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="avatar avatar--initials"
      style={{
        width: size,
        height: size,
        backgroundColor: getColor(name),
        fontSize: size * 0.38,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
