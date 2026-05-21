/**
 * utils/avatars.js
 *
 * CODE-1: Centralized utility for avatars to resolve code duplication.
 */

export const AVATAR_KEYS = [
  'male1', 'male2', 'male3', 'male4', 'male5', 'male6',
  'female1', 'female2', 'female3', 'female4', 'female5', 'female6',
];

export const AVATAR_KEYS_BY_GENDER = {
  male:   ['male1', 'male2', 'male3', 'male4', 'male5', 'male6'],
  female: ['female1', 'female2', 'female3', 'female4', 'female5', 'female6'],
  other:  ['male1', 'male2', 'male3', 'male4', 'male5', 'male6',
           'female1', 'female2', 'female3', 'female4', 'female5', 'female6'],
};

export const AVATAR_KEYS_GENDER_MAP = {
  male: ['male1', 'male2', 'male3', 'male4', 'male5', 'male6'],
  female: ['female1', 'female2', 'female3', 'female4', 'female5', 'female6'],
};

export const ALL_AVATAR_KEYS = [...AVATAR_KEYS_GENDER_MAP.male, ...AVATAR_KEYS_GENDER_MAP.female];

/**
 * Maps an avatar key to its corresponding local asset reference.
 * @param {string} key 
 */
export function getAvatarSource(key) {
  const map = {
    male1:   require('../assets/avatars/male1.webp'),
    male2:   require('../assets/avatars/male2.webp'),
    male3:   require('../assets/avatars/male3.webp'),
    male4:   require('../assets/avatars/male4.webp'),
    male5:   require('../assets/avatars/male5.webp'),
    male6:   require('../assets/avatars/male6.webp'),
    female1: require('../assets/avatars/female1.webp'),
    female2: require('../assets/avatars/female2.webp'),
    female3: require('../assets/avatars/female3.webp'),
    female4: require('../assets/avatars/female4.webp'),
    female5: require('../assets/avatars/female5.webp'),
    female6: require('../assets/avatars/female6.webp'),
  };
  return map[key] ?? map.male1;
}

/**
 * Returns the proper Image source object for a user profile.
 * @param {object} profile 
 */
export function getImageSourceFromProfile(profile) {
  if (profile?.avatarKey) return getAvatarSource(profile.avatarKey);
  if (profile?.profilePictureUrl && typeof profile.profilePictureUrl === 'string') {
    return { uri: profile.profilePictureUrl };
  }
  return getAvatarSource('male1');
}
