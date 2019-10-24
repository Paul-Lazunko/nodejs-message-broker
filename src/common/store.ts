import { resolve } from 'path';
import { STORAGE_RELATIVE_PATH } from '../constants';

export const store: any = require('data-store')({ path: resolve(__dirname, STORAGE_RELATIVE_PATH) });
