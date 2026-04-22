import Redis from 'ioredis';
const redis = new Redis('redis://localhost:6379');

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();

  try {
    if (cmd === 'keys') {
      const keys = await redis.keys(args[1] || '*');
      keys.forEach((k, i) => console.log(`${i + 1}) "${k}"`));
      if(keys.length === 0) console.log("(empty list or set)");
    } else if (cmd === 'get') {
      const val = await redis.get(args[1]);
      if (val === null) console.log("(nil)");
      else console.log(`"${val.replace(/"/g, '\\"')}"`); // minimal formatting, or just print it raw
    } else {
      console.error(`ERR unknown command '${cmd}'`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    redis.disconnect();
  }
}

main();
