export interface ChunkMetadata {
  id: string
  sourceFile: string
  topic: string
  language: 'en' | 'ar'
  updatedAt: number
}

export interface RetrievalResult {
  content: string
  distance: number
  metadata: ChunkMetadata
}
