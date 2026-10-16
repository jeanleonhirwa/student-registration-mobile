import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // keep in sync with Backend/middleware/upload.js
const ALLOWED_EXT = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'zip', 'png', 'jpg', 'jpeg', 'webp', 'heic',
];

/** Returns an error message if the file would be rejected by the server, else null. */
export function fileProblem(asset: DocumentPickerAsset): string | null {
  const ext = asset.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.includes(ext)) return `".${ext}" files are not allowed. Allowed: ${ALLOWED_EXT.join(', ')}`;
  if (asset.size && asset.size > MAX_UPLOAD_BYTES) return 'File is too large (max 10 MB)';
  return null;
}

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
