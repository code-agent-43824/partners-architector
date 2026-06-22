import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';

/** Password hashing with argon2 (spec SEC-1). */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return hash(plain);
  }

  async verify(passwordHash: string, plain: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plain);
    } catch {
      return false;
    }
  }
}
