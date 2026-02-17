import './Card.css';

export default function Card({ children, className = '', onClick, ...props }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`card ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Tag>
  );
}
