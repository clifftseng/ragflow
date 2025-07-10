// 檔案路徑: web/src/pages/km/dataset/components/km-form-schema.ts

import { z } from 'zod';

const parserConfigSchema = z
 .object({
  // 將所有可能不存在的基礎欄位都設為 optional
  layout_recognize: z.string().optional(),
  chunk_token_num: z.coerce.number().optional(),
  delimiter: z.string().optional(),
  auto_keywords: z.number().optional(),
  auto_questions: z.number().optional(),
  html4excel: z.boolean().optional(),
  tag_kb_ids: z.array(z.string()).nullish(),
  topn_tags: z.number().optional(),

  // 複合物件本身也要設為 optional，以防 parserConfig 中完全沒有 raptor 這個 key
  raptor: z
   .object({
    use_raptor: z.boolean().optional(),
    prompt: z.string().optional(),
    max_token: z.number().optional(),
    threshold: z.number().optional(),
    max_cluster: z.number().optional(),
    random_seed: z.number().optional(),
   })
   .optional(),

  graphrag: z
   .object({
    use_graphrag: z.boolean().optional(),
    entity_types: z.array(z.string()).optional(),
    method: z.string().optional(),
    resolution: z.boolean().optional(),
    community: z.boolean().optional(),
   })
   .optional(),
 })
 .optional();

export const parserSchema = z.object({
 parserId: z.string(),
 parserConfig: parserConfigSchema,
});

export type TParserSchema = z.infer<typeof parserSchema>;