import crypto from 'crypto';

export function uidHelper () {
  return crypto
    .createHash('md5')
    .update((new Date().getTime()).toString() + (Math.random() * 1000).toString())
    .digest("hex");
}
