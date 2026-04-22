import { indexer } from '../src/core/rag/indexer.js'
import { verifyChroma } from '../src/services/chromadb.js'
import { ENV } from '../src/config/env.js'

async function main() {
  console.log('🗂️  Indexing Adstartup Knowledge Base...')
  console.log(`Path: ${ENV.VAULT_PATH}`)

  await verifyChroma()
  const totalChunks = await indexer.indexVault(ENV.VAULT_PATH)
  console.log(`✅ Done! Indexed ${totalChunks} chunks`)
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Indexing failed:', err)
  process.exit(1)
})
