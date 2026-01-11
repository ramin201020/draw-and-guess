// SVG Icon Components for Draw and Guess Game
// All icons accept size and color props for customization

export const BrushIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
    <circle cx="11" cy="11" r="2"/>
  </svg>
);

export const EraserIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.4 2.8c.8-.8 2-.8 2.8 0L21 7.6c.8.8.8 2 0 2.8L12 19"/>
  </svg>
);

export const TrashIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

export const UndoIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
  </svg>
);

export const CrownIcon = ({ size = 16, color = '#FFD700' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
  </svg>
);

export const PencilIcon = ({ size = 16, color = '#FF8C42' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);

export const CheckIcon = ({ size = 16, color = '#4ade80' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

export const UserIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M20 21a8 8 0 10-16 0"/>
  </svg>
);

export const MicrophoneIcon = ({ size = 16, color = '#4ade80' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

// Profile Avatar Icons - Abstract circular designs
export const ProfileIcon1 = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <clipPath id="circle1">
        <circle cx="50" cy="50" r="48"/>
      </clipPath>
    </defs>
    <g clipPath="url(#circle1)">
      <circle cx="50" cy="50" r="50" fill="#5B7B9A"/>
      <circle cx="35" cy="45" r="35" fill="#3D5A73"/>
      <circle cx="65" cy="55" r="25" fill="#4A6B8A"/>
    </g>
    <circle cx="50" cy="50" r="48" fill="none" stroke="#3D5A73" strokeWidth="2"/>
  </svg>
);

export const ProfileIcon2 = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <clipPath id="circle2">
        <circle cx="50" cy="50" r="48"/>
      </clipPath>
    </defs>
    <g clipPath="url(#circle2)">
      <circle cx="50" cy="50" r="50" fill="#5B7B9A"/>
      <ellipse cx="40" cy="60" rx="30" ry="35" fill="#3D5A73"/>
      <ellipse cx="70" cy="30" rx="25" ry="30" fill="#8BA4B8"/>
      <circle cx="50" cy="45" r="20" fill="#4A6B8A"/>
    </g>
    <circle cx="50" cy="50" r="48" fill="none" stroke="#3D5A73" strokeWidth="2"/>
  </svg>
);

export const ProfileIcon3 = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <clipPath id="circle3">
        <circle cx="50" cy="50" r="48"/>
      </clipPath>
    </defs>
    <g clipPath="url(#circle3)">
      <circle cx="50" cy="50" r="50" fill="#4A5D6A"/>
      <path d="M80 20 Q100 50 70 80 Q40 100 20 70 Q0 40 30 20 Q60 0 80 20" fill="#D9E2E8"/>
      <ellipse cx="60" cy="65" rx="35" ry="30" fill="#3D5A73"/>
    </g>
    <circle cx="50" cy="50" r="48" fill="none" stroke="#3D5A73" strokeWidth="2"/>
  </svg>
);

export const ProfileIcon4 = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <clipPath id="circle4">
        <circle cx="50" cy="50" r="48"/>
      </clipPath>
    </defs>
    <g clipPath="url(#circle4)">
      <circle cx="50" cy="50" r="50" fill="#8BA4B8"/>
      <path d="M20 80 Q0 50 30 20 Q60 -10 90 30 Q100 60 70 80 Q40 100 20 80" fill="#F5F5F5"/>
      <ellipse cx="55" cy="60" rx="30" ry="35" fill="#5B7B9A"/>
      <ellipse cx="40" cy="70" rx="25" ry="25" fill="#3D5A73"/>
    </g>
    <circle cx="50" cy="50" r="48" fill="none" stroke="#5B7B9A" strokeWidth="2"/>
  </svg>
);

// Array of profile icons for easy random selection
export const ProfileIcons = [ProfileIcon1, ProfileIcon2, ProfileIcon3, ProfileIcon4];

// Helper to get a profile icon by index
export const getProfileIcon = (index) => {
  const icons = [ProfileIcon1, ProfileIcon2, ProfileIcon3, ProfileIcon4];
  return icons[index % icons.length];
};
