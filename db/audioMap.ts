export const AUDIO_MAP: Record<string, number> = {
  'al-hamdu-bidhikrihi.mp3': require('@/assets/audio/al-hamdu-bidhikrihi.mp3'),
  'al-hamdu-nushur.mp3': require('@/assets/audio/al-hamdu-nushur.mp3'),
  'alhamdu-lillah.mp3': require('@/assets/audio/alhamdu-lillah.mp3'),
  'allahu-akbar.mp3': require('@/assets/audio/allahu-akbar.mp3'),
  'allahumma-amsayna-ilaykan-nushur.mp3': require('@/assets/audio/allahumma-amsayna-ilaykan-nushur.mp3'),
  'allahumma-anta.mp3': require('@/assets/audio/allahumma-anta.mp3'),
  'allahumma-arsalt.mp3': require('@/assets/audio/allahumma-arsalt.mp3'),
  'allahumma-asbahna-ilaykal-masir.mp3': require('@/assets/audio/allahumma-asbahna-ilaykal-masir.mp3'),
  'allahumma-asbahna-ilaykan-nushur.mp3': require('@/assets/audio/allahumma-asbahna-ilaykan-nushur.mp3'),
  'allahumma-ibadatik.mp3': require('@/assets/audio/allahumma-ibadatik.mp3'),
  'allahumma-shirkihi.mp3': require('@/assets/audio/allahumma-shirkihi.mp3'),
  'allahumma-tahti.mp3': require('@/assets/audio/allahumma-tahti.mp3'),
  'allahumma-wal-ikram.mp3': require('@/assets/audio/allahumma-wal-ikram.mp3'),
  'amsayna-fil-qabr.mp3': require('@/assets/audio/amsayna-fil-qabr.mp3'),
  'asbahna-fil-qabr.mp3': require('@/assets/audio/asbahna-fil-qabr.mp3'),
  'astaghfirullah.mp3': require('@/assets/audio/astaghfirullah.mp3'),
  'audhu-khalaq.mp3': require('@/assets/audio/audhu-khalaq.mp3'),
  'aytul-kursi.mp3': require('@/assets/audio/aytul-kursi.mp3'),
  'bismika-ahya.mp3': require('@/assets/audio/bismika-ahya.mp3'),
  'bismika-janbi.mp3': require('@/assets/audio/bismika-janbi.mp3'),
  'bismillah-as-samiul-alim.mp3': require('@/assets/audio/bismillah-as-samiul-alim.mp3'),
  'la-al-kafirun.mp3': require('@/assets/audio/la-al-kafirun.mp3'),
  'la-l-jadd.mp3': require('@/assets/audio/la-l-jadd.mp3'),
  'la-qadir.mp3': require('@/assets/audio/la-qadir.mp3'),
  'la-wallahu-akbar.mp3': require('@/assets/audio/la-wallahu-akbar.mp3'),
  'la-yuhyi-wa-yumitu-qadir.mp3': require('@/assets/audio/la-yuhyi-wa-yumitu-qadir.mp3'),
  'raditu-nabiyyan.mp3': require('@/assets/audio/raditu-nabiyyan.mp3'),
  'subhan-allah.mp3': require('@/assets/audio/subhan-allah.mp3'),
  'subhanal-malikil-quddus.mp3': require('@/assets/audio/subhanal-malikil-quddus.mp3'),
  'subhanallahi-kalimatih.mp3': require('@/assets/audio/subhanallahi-kalimatih.mp3'),
  'subhanallahi-wa-bihamdihi.mp3': require('@/assets/audio/subhanallahi-wa-bihamdihi.mp3'),
  'surah-al-falaq.mp3': require('@/assets/audio/surah-al-falaq.mp3'),
  'surah-al-ikhlas.mp3': require('@/assets/audio/surah-al-ikhlas.mp3'),
  'surah-an-nas.mp3': require('@/assets/audio/surah-an-nas.mp3'),
  'surah-baqarah-last-2-verses.mp3': require('@/assets/audio/surah-baqarah-last-2-verses.mp3'),
  'three-quls.mp3': require('@/assets/audio/three-quls.mp3'),
};

export function resolveAudio(filename: string | null | undefined): number | undefined {
  if (!filename) return undefined;
  const src = AUDIO_MAP[filename];
  if (__DEV__ && !src) {
    console.warn(`[audioMap] no require for "${filename}"`);
  }
  return src;
}
