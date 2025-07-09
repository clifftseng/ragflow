// 檔案路徑: web/src/pages/km/dataset/components/km-form-schema.ts
// 【【【KM 頁面專用的、完全隔離的 Schema】】】

import { z } from 'zod';

// 我們只從原始檔案中，複製我們真正需要的 parser_config 部分
const parserConfigSchema = z
  .object({
    layout_recognize: z.string(),
    chunk_token_num: z.number(),
    delimiter: z.string(),
    auto_keywords: z.number().optional(),
    auto_questions: z.number().optional(),
    html4excel: z.boolean(),
    tag_kb_ids: z.array(z.string()).nullish(),
    topn_tags: z.number().optional(),
    raptor: z
      .object({
        use_raptor: z.boolean().optional(),
        prompt: z.string().optional(),
        max_token: z.number().optional(),
        threshold: z.number().optional(),
        max_cluster: z.number().optional(),
        random_seed: z.number().optional(),
      })
      .refine(
        (data) => {
          if (data.use_raptor && !data.prompt) {
            return false;
          }
          return true;
        },
        {
          message: 'Prompt is required',
          path: ['prompt'],
        },
      ),
    graphrag: z
      .object({
        use_graphrag: z.boolean().optional(),
        entity_types: z.array(z.string()).optional(),
        method: z.string().optional(),
        resolution: z.boolean().optional(),
        community: z.boolean().optional(),
      })
      .refine(
        (data) => {
          if (
            data.use_graphrag &&
            (!data.entity_types || data.entity_types.length === 0)
          ) {
            return false;
          }
          return true;
        },
        {
          message: 'Please enter Entity types',
          path: ['entity_types'],
        },
      ),
  })
  .optional();

// 現在，我們定義並匯出我們對話框所需要的 parserSchema 和 TParserSchema
export const parserSchema = z.object({
  parserId: z.string(),
  parserConfig: parserConfigSchema,
});

export type TParserSchema = z.infer<typeof parserSchema>;