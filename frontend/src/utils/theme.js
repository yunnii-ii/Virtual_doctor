// Shared Theme Constants for Virtual Doctor
// All screens should import font and color values from here.

export const FONTS = {
  regular: {
    fontFamily: 'Times New Roman',
  },
  bold: {
    fontFamily: 'Times New Roman',
    fontWeight: 'bold',
  },
  light: {
    fontFamily: 'Times New Roman',
    fontWeight: '300',
  },
};

export const COLORS = {
  primary: '#5568FF',
  secondary: '#4ECDC4',
  accent: '#9B59B6',
  danger: '#FF6B6B',
  purple: '#A855F7',
  teal: '#10B981',
  pink: '#F472B6',
  orange: '#FB923C',
  indigo: '#6366F1',
  cyan: '#06B6D4',
  deepPurple: '#8B5CF6',
  lime: '#84CC16',
  yellow: '#FBBF24',
  warmYellow: '#F59E0B',
  sky: '#3B82F6',
  rose: '#F43F5E',

  // Neutrals
  background: '#F8F9FF',
  surface: '#FFFFFF',
  textPrimary: '#2D2E59',
  textSecondary: '#6D6E9C',
  textMuted: '#9FA0C3',
  border: '#E0E1F7',
  divider: '#F0F1FB',

  // Advanced feature colors
  aiDoctor: '#A78BFF',
  analytics: '#82C9FF',
  telemedicine: '#8EC5FF',
  privacy: '#FF9BAA',
  voice: '#B9A3FF',
  intervention: '#FFC09A',
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};
