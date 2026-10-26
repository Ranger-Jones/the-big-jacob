import { expect, test } from 'vitest';
import { IMAGE_TOO_BIG, validateImageFile } from './crop-image';

test.each([
  [{ type: 'image/jpeg', size: 1000 }, null],
  [{ type: 'image/jpeg', size: 8 * 1024 * 1024 }, null],
  [{ type: 'image/heic', size: 3 * 1024 * 1024 }, null],
  [{ type: '', size: 3 * 1024 * 1024, name: 'IMG_0001.HEIC' }, null],
  [{ type: 'image/webp', size: 25 * 1024 * 1024 }, null],
  [{ type: 'image/gif', size: 1000 }, IMAGE_TOO_BIG],
  [{ type: 'image/png', size: 25 * 1024 * 1024 + 1 }, IMAGE_TOO_BIG],
  [{ type: '', size: 1000, name: 'notes.txt' }, IMAGE_TOO_BIG],
])('validateImageFile(%j)', (file, expected) => {
  expect(validateImageFile(file)).toBe(expected);
});
