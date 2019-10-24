import crypto, {Cipher, Decipher} from 'crypto';
const algorithm = 'aes-256-cbc';

export class CryptoHelper {

   public static ENCRYPT(key: string, text: string): string {
     const cipher: Cipher = crypto.createCipher(algorithm, key);
     let encrypted = cipher.update(text, "utf8", "hex");
     encrypted += cipher.final('hex');
     return encrypted;
  }

  public static DECRYPT(key: string, text: string) {
    const decipher: Decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(text,'hex', 'utf8');
    decrypted +=  decipher.final('utf8');
    return decrypted;
  }

}
