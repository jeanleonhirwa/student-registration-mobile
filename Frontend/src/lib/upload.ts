import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';

/** Append a picked document to a FormData body (web needs a Blob, native a {uri,name,type} part). */
export async function appendFile(form: FormData, asset: DocumentPickerAsset, field = 'file') {
  if (Platform.OS === 'web') {
    form.append(field, asset.file ?? (await (await fetch(asset.uri)).blob()), asset.name);
  } else {
    form.append(field, {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }
}
