import { Pool } from 'pg';
import { DsqlSigner } from '@aws-sdk/dsql-signer';

const hostname = process.env.DSQL_HOST!;
const region   = process.env.AWS_REGION || 'us-east-1';

const signer = new DsqlSigner({ hostname, region });

// pg supports a password() function — called fresh for each new connection,
// so tokens never expire mid-pool even though they only last 15 minutes.
export const pool = new Pool({
  host:     hostname,
  port:     parseInt(process.env.DSQL_PORT || '5432'),
  database: process.env.DSQL_DATABASE || 'postgres',
  user:     process.env.DSQL_USER     || 'admin',
  password: () => signer.getDbConnectAdminAuthToken(),
  ssl:      { rejectUnauthorized: true },
  max:      5,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
});
