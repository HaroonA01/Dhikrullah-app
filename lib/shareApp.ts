import { Platform, Share } from 'react-native';
import { Asset } from 'expo-asset';

let _leafletUri: string | null = null;

// Resolve the bundled leaflet to a local file:// URI. iOS only — RN Share
// attaches a file via its `url` field on iOS; Android ignores it.
const getLeafletUri = async (): Promise<string | undefined> => {
  if (Platform.OS !== 'ios') return undefined;
  if (_leafletUri) return _leafletUri;
  try {
    const asset = Asset.fromModule(require('@/assets/leaflet.png'));
    if (!asset.localUri) await asset.downloadAsync();
    _leafletUri = asset.localUri ?? asset.uri;
    return _leafletUri ?? undefined;
  } catch {
    return undefined;
  }
};

// Shares the app invite. iOS: caption + leaflet image. Android: caption only.
export const shareAppInvite = async (message: string): Promise<void> => {
  const url = await getLeafletUri();
  await Share.share(url ? { message, url } : { message });
};
