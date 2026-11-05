import React from 'react';
import { AVATAR_MAP } from '../constants/avatars';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface MemberAvatarProps {
  member?: {
    name?: string;
    nickname?: string | null;
    avatar?: string | null;
    color?: string;
  } | null;
  size?: AvatarSize;
  className?: string;
  fallbackLetter?: string;
  title?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; icon: string; text: string }> = {
  xs: {
    container: 'w-4 h-4 rounded-md',
    icon: 'w-2.5 h-2.5',
    text: 'text-[9px]'
  },
  sm: {
    container: 'w-6 h-6 rounded-lg',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs'
  },
  md: {
    container: 'w-8 h-8 rounded-xl',
    icon: 'w-4 h-4',
    text: 'text-sm'
  },
  lg: {
    container: 'w-10 h-10 rounded-xl',
    icon: 'w-5 h-5',
    text: 'text-base'
  },
  xl: {
    container: 'w-12 h-12 rounded-2xl',
    icon: 'w-6 h-6',
    text: 'text-lg'
  }
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  member,
  size = 'md',
  className = '',
  fallbackLetter,
  title
}) => {
  const color = member?.color || '#0284C7';
  const avatarId = member?.avatar;
  const iconDef = avatarId ? AVATAR_MAP.get(avatarId) : null;

  const displayName = member?.nickname || member?.name || 'Membro';
  const initial =
    fallbackLetter ||
    (displayName.trim().charAt(0) ? displayName.trim().charAt(0).toUpperCase() : '?');

  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className={`inline-flex items-center justify-center text-white font-bold select-none shrink-0 shadow-2xs transition-transform ${sizeConfig.container} ${className}`}
      style={{ backgroundColor: color }}
      title={title || displayName}
      aria-label={title || displayName}
    >
      {iconDef ? (
        <svg
          viewBox={iconDef.viewBox}
          className={`${sizeConfig.icon} fill-current`}
          aria-hidden="true"
        >
          <path d={iconDef.path} />
        </svg>
      ) : (
        <span className={`leading-none font-bold ${sizeConfig.text}`}>
          {initial}
        </span>
      )}
    </div>
  );
};
