import { glob } from 'glob'
import { readFileSync } from 'fs'
import path from 'path'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { embedder } from './embedder.js'
import { getOrCreateCollection } from '../../services/chromadb.js'
import { CONSTANTS } from '../../config/constants.js'
import { logger } from '../../utils/logger.js'

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n## ', '\n### ', '\n\n', '\n', '. ', ' ']
})

function detectTopic(filePath: string, _content: string): string {
  const lower = filePath.toLowerCase()
  if (lower.includes('pricing') || lower.includes('price') || lower.includes('04 -')) return 'pricing'
  if (lower.includes('service') || lower.includes('overview') || lower.includes('01 -')) return 'services'
  if (lower.includes('process') || lower.includes('onboarding') || lower.includes('06 -')) return 'process'
  if (lower.includes('case') || lower.includes('proof') || lower.includes('11 -')) return 'case_studies'
  if (lower.includes('commission') || lower.includes('billing') || lower.includes('05 -')) return 'commission'
  if (lower.includes('objection') || lower.includes('07 -')) return 'objections'
  if (lower.includes('closing') || lower.includes('10 -')) return 'closing'
  if (lower.includes('ads') || lower.includes('campaign') || lower.includes('02 -')) return 'ads'
  if (lower.includes('support') || lower.includes('03 -')) return 'support'
  if (lower.includes('marketplace') || lower.includes('08 -')) return 'marketplace'
  if (lower.includes('qualification') || lower.includes('09 -')) return 'qualification'
  if (lower.includes('timeline') || lower.includes('12 -')) return 'timeline'
  if (lower.includes('sales flow') || lower.includes('13 -')) return 'sales_flow'
  if (lower.includes('question') || lower.includes('14 -')) return 'questions'
  if (lower.includes('first message') || lower.includes('18 -')) return 'first_message'
  if (lower.includes('conversation') || lower.includes('17 -')) return 'examples'
  return 'general'
}

function detectLanguage(content: string): 'ar' | 'en' {
  const arabicChars = (content.match(/[\u0600-\u06FF]/g) || []).length
  return arabicChars > content.length * 0.3 ? 'ar' : 'en'
}

export const indexer = {
  async indexVault(vaultPath: string): Promise<number> {
    const files = glob.sync(`${vaultPath}/**/*.md`)
    let totalChunks = 0
    const collection = await getOrCreateCollection(CONSTANTS.CHROMA_COLLECTION)

    logger.info({ files: files.length, vaultPath }, 'Starting vault indexing...')

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8')

        // Skip MOC and Home files — they're just links
        const baseName = path.basename(file, '.md')
        if (baseName.startsWith('_MOC') || baseName.includes('Home')) continue

        const topic = detectTopic(file, content)
        const language = detectLanguage(content)
        const chunks = await splitter.splitText(content)

        if (chunks.length === 0) continue

        // Batch embed (max 20 at a time for OpenRouter rate limits)
        const batchSize = 20
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize)
          const embeddings = await embedder.batchEmbed(batch)

          await collection.upsert({
            ids: batch.map((_, j) => `${baseName}:${i + j}`),
            embeddings,
            documents: batch,
            metadatas: batch.map(() => ({
              sourceFile: file,
              topic,
              language,
              updatedAt: Date.now()
            }))
          })
        }

        totalChunks += chunks.length
        logger.info({ file: baseName, chunks: chunks.length, topic }, 'Indexed file')
      } catch (err) {
        logger.error({ err, file }, 'Failed to index file')
      }
    }

    logger.info({ totalChunks, files: files.length }, 'Vault indexing complete')
    return totalChunks
  }
}
