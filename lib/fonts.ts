export type ArabicFontId =
  | 'system'
  | 'uthmani'
  | 'amiri'
  | 'scheherazade'
  | 'noto-naskh'
  | 'cairo'
  | 'tajawal'
  | 'lateef'
  | 'reem-kufi'
  | 'markazi'
  | 'harmattan'
  | 'mada'
  | 'changa'
  | 'el-messiri';

export type EnglishFontId =
  | 'system'
  | 'lato'
  | 'merriweather'
  | 'nunito'
  | 'poppins'
  | 'playfair'
  | 'raleway'
  | 'inter'
  | 'source-serif'
  | 'crimson'
  | 'karla'
  | 'work-sans'
  | 'dm-sans';

export type TextSizeId = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const ARABIC_FONTS = [
  { id: 'system', label: 'System', fontFamily: null },
  { id: 'uthmani', label: 'Uthmani Script', fontFamily: 'KFGQPCUthmanicScriptHAFS' },
  { id: 'amiri', label: 'Amiri', fontFamily: 'Amiri_400Regular' },
  { id: 'scheherazade', label: 'Scheherazade New', fontFamily: 'ScheherazadeNew_400Regular' },
  { id: 'noto-naskh', label: 'Noto Naskh', fontFamily: 'NotoNaskhArabic_400Regular' },
  { id: 'cairo', label: 'Cairo', fontFamily: 'Cairo_400Regular' },
  { id: 'tajawal', label: 'Tajawal', fontFamily: 'Tajawal_400Regular' },
  { id: 'lateef', label: 'Lateef', fontFamily: 'Lateef_400Regular' },
  { id: 'reem-kufi', label: 'Reem Kufi', fontFamily: 'ReemKufi_400Regular' },
  { id: 'markazi', label: 'Markazi Text', fontFamily: 'MarkaziText_400Regular' },
  { id: 'harmattan', label: 'Harmattan', fontFamily: 'Harmattan_400Regular' },
  { id: 'mada', label: 'Mada', fontFamily: 'Mada_400Regular' },
  { id: 'changa', label: 'Changa', fontFamily: 'Changa_400Regular' },
  { id: 'el-messiri', label: 'El Messiri', fontFamily: 'ElMessiri_400Regular' },
] as const;

export const ENGLISH_FONTS = [
  { id: 'system', label: 'System', fontFamily: null },
  { id: 'lato', label: 'Lato', fontFamily: 'Lato_400Regular' },
  { id: 'merriweather', label: 'Merriweather', fontFamily: 'Merriweather_400Regular' },
  { id: 'nunito', label: 'Nunito', fontFamily: 'Nunito_400Regular' },
  { id: 'poppins', label: 'Poppins', fontFamily: 'Poppins_400Regular' },
  { id: 'playfair', label: 'Playfair Display', fontFamily: 'PlayfairDisplay_400Regular' },
  { id: 'raleway', label: 'Raleway', fontFamily: 'Raleway_400Regular' },
  { id: 'inter', label: 'Inter', fontFamily: 'Inter_400Regular' },
  { id: 'source-serif', label: 'Source Serif', fontFamily: 'SourceSerif4_400Regular' },
  { id: 'crimson', label: 'Crimson Pro', fontFamily: 'CrimsonPro_400Regular' },
  { id: 'karla', label: 'Karla', fontFamily: 'Karla_400Regular' },
  { id: 'work-sans', label: 'Work Sans', fontFamily: 'WorkSans_400Regular' },
  { id: 'dm-sans', label: 'DM Sans', fontFamily: 'DMSans_400Regular' },
] as const;

export const ARABIC_FONT_IDS = new Set<ArabicFontId>(ARABIC_FONTS.map(f => f.id as ArabicFontId));
export const ENGLISH_FONT_IDS = new Set<EnglishFontId>(ENGLISH_FONTS.map(f => f.id as EnglishFontId));

export const TEXT_SIZE_OPTIONS: { id: TextSizeId; label: string }[] = [
  { id: 'xs', label: 'XS' },
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
  { id: 'xl', label: 'XL' },
  { id: 'xxl', label: 'XXL' },
];

export const TEXT_SIZE_IDS = new Set<TextSizeId>(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);

export const ARABIC_SIZE: Record<TextSizeId, number> = { xs: 20, sm: 24, md: 30, lg: 36, xl: 44, xxl: 54 };
export const TRANSLIT_SIZE: Record<TextSizeId, number> = { xs: 17, sm: 20, md: 25, lg: 30, xl: 37, xxl: 45 };
export const TRANSLATION_SIZE: Record<TextSizeId, number> = { xs: 16, sm: 19, md: 24, lg: 29, xl: 36, xxl: 44 };

export const GOOGLE_FONT_ASSETS = {
  KFGQPCUthmanicScriptHAFS: require('@/assets/fonts/KFGQPCUthmanicScriptHAFS.otf'),
  Amiri_400Regular: require('@expo-google-fonts/amiri/400Regular/Amiri_400Regular.ttf'),
  ScheherazadeNew_400Regular: require('@expo-google-fonts/scheherazade-new/400Regular/ScheherazadeNew_400Regular.ttf'),
  NotoNaskhArabic_400Regular: require('@expo-google-fonts/noto-naskh-arabic/400Regular/NotoNaskhArabic_400Regular.ttf'),
  Cairo_400Regular: require('@expo-google-fonts/cairo/400Regular/Cairo_400Regular.ttf'),
  Tajawal_400Regular: require('@expo-google-fonts/tajawal/400Regular/Tajawal_400Regular.ttf'),
  Lateef_400Regular: require('@expo-google-fonts/lateef/400Regular/Lateef_400Regular.ttf'),
  Lato_400Regular: require('@expo-google-fonts/lato/400Regular/Lato_400Regular.ttf'),
  Merriweather_400Regular: require('@expo-google-fonts/merriweather/400Regular/Merriweather_400Regular.ttf'),
  Nunito_400Regular: require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
  Poppins_400Regular: require('@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf'),
  PlayfairDisplay_400Regular: require('@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'),
  Raleway_400Regular: require('@expo-google-fonts/raleway/400Regular/Raleway_400Regular.ttf'),
  ReemKufi_400Regular: require('@expo-google-fonts/reem-kufi/400Regular/ReemKufi_400Regular.ttf'),
  MarkaziText_400Regular: require('@expo-google-fonts/markazi-text/400Regular/MarkaziText_400Regular.ttf'),
  Harmattan_400Regular: require('@expo-google-fonts/harmattan/400Regular/Harmattan_400Regular.ttf'),
  Mada_400Regular: require('@expo-google-fonts/mada/400Regular/Mada_400Regular.ttf'),
  Changa_400Regular: require('@expo-google-fonts/changa/400Regular/Changa_400Regular.ttf'),
  ElMessiri_400Regular: require('@expo-google-fonts/el-messiri/400Regular/ElMessiri_400Regular.ttf'),
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  SourceSerif4_400Regular: require('@expo-google-fonts/source-serif-4/400Regular/SourceSerif4_400Regular.ttf'),
  CrimsonPro_400Regular: require('@expo-google-fonts/crimson-pro/400Regular/CrimsonPro_400Regular.ttf'),
  Karla_400Regular: require('@expo-google-fonts/karla/400Regular/Karla_400Regular.ttf'),
  WorkSans_400Regular: require('@expo-google-fonts/work-sans/400Regular/WorkSans_400Regular.ttf'),
  DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
};
