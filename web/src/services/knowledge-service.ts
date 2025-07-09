import { IRenameTag } from '@/interfaces/database/knowledge';
import {
  IFetchDocumentListRequestBody,
  IFetchKnowledgeListRequestBody,
  IFetchKnowledgeListRequestParams,
} from '@/interfaces/request/knowledge';
import api from '@/utils/api';
import registerServer from '@/utils/register-server';
import request, { post } from '@/utils/request';

const {
  create_kb,
  update_kb,
  rm_kb,
  get_kb_detail,
  kb_list,
  get_document_list,
  document_change_status,
  document_rm,
  document_delete,
  document_create,
  km_document_create, // 【【【導入新路由】】】
  document_change_parser,
  document_thumbnails,
  chunk_list,
  create_chunk,
  set_chunk,
  get_chunk,
  switch_chunk,
  rm_chunk,
  retrieval_test,
  document_rename,
  document_run,
  document_upload,
  web_crawl,
  knowledge_graph,
  document_infos,
  upload_and_parse,
  listTagByKnowledgeIds,
  setMeta,
  km_document_rm,
  km_document_run,
  km_document_rename,
  km_document_change_status,
  km_document_change_parser,
  km_document_set_meta,
  km_document_thumbnails,
  km_chunk_list,
  km_chunk_set,
  km_chunk_rm,
  km_chunk_switch,
  km_chunk_create,


} = api;

const methods = {
  // 知识库管理
  createKb: {
    url: create_kb,
    method: 'post',
  },
  updateKb: {
    url: update_kb,
    method: 'post',
  },
  rmKb: {
    url: rm_kb,
    method: 'post',
  },
  get_kb_detail: {
    url: get_kb_detail,
    method: 'get',
  },
  getList: {
    url: kb_list,
    method: 'post',
  },
  // document manager
  get_document_list: {
    url: get_document_list,
    method: 'get',
  },
  document_change_status: {
    url: document_change_status,
    method: 'post',
  },
  document_rm: {
    url: document_rm,
    method: 'post',
  },
  document_rename: {
    url: document_rename,
    method: 'post',
  },
  document_create: {
    url: document_create,
    method: 'post',
  },

  km_document_create: { url: km_document_create, method: 'post' },
  km_document_rm: { url: km_document_rm, method: 'post' },
  km_document_run: { url: km_document_run, method: 'post' },
  km_document_rename: { url: km_document_rename, method: 'post' },
  km_document_change_status: { url: km_document_change_status, method: 'post' },
  km_document_change_parser: { url: km_document_change_parser, method: 'post' },
  km_document_set_meta: { url: km_document_set_meta, method: 'post' },
  km_document_thumbnails: { url: km_document_thumbnails, method: 'get' },
  km_chunk_list: { url: km_chunk_list, method: 'post' },
  km_chunk_set: { url: km_chunk_set, method: 'post' },
  km_chunk_rm: { url: km_chunk_rm, method: 'post' },
  km_chunk_switch: { url: km_chunk_switch, method: 'post' },
  km_chunk_create: { url: km_chunk_create, method: 'post' },   

  document_run: {
    url: document_run,
    method: 'post',
  },
  document_change_parser: {
    url: document_change_parser,
    method: 'post',
  },
  document_thumbnails: {
    url: document_thumbnails,
    method: 'get',
  },
  document_upload: {
    url: document_upload,
    method: 'post',
  },
  web_crawl: {
    url: web_crawl,
    method: 'post',
  },
  document_infos: {
    url: document_infos,
    method: 'post',
  },
  setMeta: {
    url: setMeta,
    method: 'post',
  },
  // chunk管理
  chunk_list: {
    url: chunk_list,
    method: 'post',
  },
  create_chunk: {
    url: create_chunk,
    method: 'post',
  },
  set_chunk: {
    url: set_chunk,
    method: 'post',
  },
  get_chunk: {
    url: get_chunk,
    method: 'get',
  },
  switch_chunk: {
    url: switch_chunk,
    method: 'post',
  },
  rm_chunk: {
    url: rm_chunk,
    method: 'post',
  },
  retrieval_test: {
    url: retrieval_test,
    method: 'post',
  },
  knowledge_graph: {
    url: knowledge_graph,
    method: 'get',
  },
  document_delete: {
    url: document_delete,
    method: 'delete',
  },
  upload_and_parse: {
    url: upload_and_parse,
    method: 'post',
  },
  listTagByKnowledgeIds: {
    url: listTagByKnowledgeIds,
    method: 'get',
  },
  documentFilter: {
    url: api.get_dataset_filter,
    method: 'post',
  },
};

const kbService = registerServer<keyof typeof methods>(methods, request);

export const uploadPublicDocument = (kb_id: string, data: FormData) => {
  // 直接從 api 物件呼叫函式來取得完整、正確的 URL
  const url = api.km_document_upload(kb_id);
  return request.post<any>(url, {
    data,
  });
};

export const listTag = (knowledgeId: string) =>
  request.get(api.listTag(knowledgeId));

export const removeTag = (knowledgeId: string, tags: string[]) =>
  post(api.removeTag(knowledgeId), { tags });

export const renameTag = (
  knowledgeId: string,
  { fromTag, toTag }: IRenameTag,
) => post(api.renameTag(knowledgeId), { fromTag, toTag });

export function getKnowledgeGraph(knowledgeId: string) {
  return request.get(api.getKnowledgeGraph(knowledgeId));
}

export function deleteKnowledgeGraph(knowledgeId: string) {
  return request.delete(api.getKnowledgeGraph(knowledgeId));
}

export const listDataset = (
  params?: IFetchKnowledgeListRequestParams,
  body?: IFetchKnowledgeListRequestBody,
) => request.post(api.kb_list, { data: body || {}, params });

export const listDocument = (
  params?: IFetchKnowledgeListRequestParams,
  body?: IFetchDocumentListRequestBody,
) => request.post(api.get_document_list, { data: body || {}, params });

export const documentFilter = (kb_id: string) =>
  request.post(api.get_dataset_filter, { kb_id });

export default kbService;
