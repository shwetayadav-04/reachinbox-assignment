const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
r.eval(`
  redis.call('SET', 'test_key', 1725270060000)
  return redis.call('GET', 'test_key')
`, 0).then(console.log).finally(() => process.exit(0));
