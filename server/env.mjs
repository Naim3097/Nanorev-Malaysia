// Load environment from .env.local then .env, BEFORE any other module reads
// process.env. dotenv never overrides already-set keys, so precedence is:
//   host env vars  >  .env.local  >  .env
// (missing files are ignored). Import this first in the server entrypoint.
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
