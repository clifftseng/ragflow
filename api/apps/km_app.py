# 檔案路徑: api/apps/km_app.py
# 【【【最終修正版，修正所有已知錯誤】】】

import asyncio
import inspect
import time
from functools import wraps

from quart import Blueprint, request, send_file
from api.db.services.knowledgebase_service import KnowledgebaseService
from api.db.services.document_service import DocumentService
from api.utils.api_utils import (
    get_json_result,
    server_error_response,
    get_data_error_result,
    validate_request,
    not_allowed_parameters,
    get_request_json,
)
from api.db.services.file_service import FileService
from api.db import FileType
from common.constants import TaskStatus, RetCode, FileSource, LLMType, StatusEnum, PAGERANK_FLD
from api.db.services.file2document_service import File2DocumentService
from api.db.db_models import Task, File
from common.misc_utils import get_uuid
from api.constants import FILE_NAME_LEN_LIMIT, DATASET_NAME_LIMIT
from common import settings
from api.db.services.task_service import queue_tasks
from api.db.services.user_service import TenantService
from rag.nlp import search
from api.db.db_models import Knowledgebase, Task
from api.db.services.task_service import TaskService, queue_tasks
import os
import io # 【【【新增】】】: 導入 io 模組
from api.utils.api_utils import verify_url_token
from api.utils.km_auth import encrypt_token
from api.apps import login_required, current_user
from api.db.services.llm_service import LLMBundle
from rag.app.tag import label_question
from rag.prompts.generator import cross_languages, keyword_extraction
from common.metadata_utils import apply_meta_data_filter

#?token=dbbV1cU0i5ZIcCMjMi-q3JVveyKm90G2rXz7O6WrdHBuszNdfTZ78NtWCmdWh8zneXGn36HAWa2752eg1kOMNwbw1tu1onqMLiDJL7mvuTnlFPezqrhBT_c49ukJ973QLw1ubgDpSmVuAgaV2S-SNcT1pVJNeRfzeDhivMGolS6ke_qCXTqRrX7twfVYrcntSuqaDqIyPgj1SxGUbcX1XloVCHh7_2jxB6jxBC3LyrG-6ALg62UE91yFKy63YkYgreKqB8OdqO0baD8YgnLX119TfQlMko0-m2jIU8mrlL5NHC3V7vs1pZ4BKoipEOgD1UaXxMv8QGigxA-1EDx-ag==
# @classmethod
# def get_private_key(cls):
#     if cls._private_key is None:
#         try:
#             with open("conf/private_key.pem", "rb") as f:
#                 cls._private_key = serialization.load_pem_private_key(f.read(), password=None)
#         except FileNotFoundError:
#             logging.error("FATAL: conf/private_key.pem not found. Token validation will fail.")
#             raise
#     return cls._private_key
        
manager = Blueprint('km_app', __name__)
KM_TOKEN_TTL_SECONDS = 7 * 24 * 3600


def require_km_token(func):
    @wraps(func)
    async def decorated_function(*args, **kwargs):
        token = request.args.get("token")
        if not token:
            return get_json_result(code=403, message="Access Forbidden:Missing token.")
        if not verify_url_token(token):
            return get_json_result(code=403, message="Access Forbidden: Invalid or missing token.")
        if inspect.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        return func(*args, **kwargs)
    return decorated_function


@manager.route('/token', methods=['GET'])
@login_required
async def create_km_token():
    kb_id = request.args.get("kb_id")
    if not kb_id:
        return get_data_error_result(message="kb_id is required.")

    try:
        if not KnowledgebaseService.query(created_by=current_user.id, id=kb_id):
            return get_json_result(
                data=False,
                message='Only owner of dataset authorized for this operation.',
                code=RetCode.OPERATING_ERROR,
            )

        expire_at = int(time.time()) + KM_TOKEN_TTL_SECONDS
        token = encrypt_token({"id": kb_id, "issuetime": expire_at})
        return get_json_result(data={"token": token, "expire_at": expire_at})
    except Exception as e:
        return server_error_response(e)

@manager.route('/detail', methods=['GET'])
@require_km_token
async def get_kb_detail():
    kb_id = request.args.get("kb_id")
    if not kb_id:
        return get_data_error_result(message="kb_id is required.")
    try:
        res = KnowledgebaseService.get_public_detail(kb_id)
        if res is None:
            return get_json_result(data=None, code=404, message=f"Knowledge base '{kb_id}' not found.")
        return get_json_result(data=res)
    except Exception as e:
        return server_error_response(e)

@manager.route('/documents', methods=['GET'])
@require_km_token
async def get_documents():
    kb_id = request.args.get("kb_id")
    if not kb_id:
        return get_data_error_result(message="kb_id is required.")
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 10))
    except (ValueError, TypeError):
        page = 1
        page_size = 10
    keywords = request.args.get("keywords")
    run_status = request.args.getlist("run_status")
    types = request.args.getlist("types")
    try:
        docs, total = DocumentService.get_public_list(kb_id, page, page_size, keywords, run_status, types)
        return get_json_result(data={"docs": docs, "total": total})
    except Exception as e:
        return server_error_response(e)


def _run_async(coro):
    try:
        return asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            fut = asyncio.run_coroutine_threadsafe(coro, loop)
            return fut.result()
        return loop.run_until_complete(coro)


@manager.route('/update', methods=['POST'])
@require_km_token
@validate_request("kb_id", "name", "description", "parser_id")
@not_allowed_parameters("id", "tenant_id", "created_by", "create_time", "update_time", "create_date", "update_date", "created_by")
async def update_public_kb():
    req = await get_request_json() or {}
    if not isinstance(req.get("name"), str):
        return get_data_error_result(message="Dataset name must be string.")
    if req["name"].strip() == "":
        return get_data_error_result(message="Dataset name can't be empty.")
    if len(req["name"].encode("utf-8")) > DATASET_NAME_LIMIT:
        return get_data_error_result(
            message=f"Dataset name length is {len(req['name'])} which is large than {DATASET_NAME_LIMIT}"
        )
    req["name"] = req["name"].strip()

    try:
        e, kb = KnowledgebaseService.get_by_id(req["kb_id"])
        if not e:
            return get_data_error_result(message="Can't find this dataset!")

        # Rename folder in FileService if needed
        if req["name"].lower() != kb.name.lower():
            FileService.filter_update(
                [
                    File.tenant_id == kb.tenant_id,
                    File.source_type == FileSource.KNOWLEDGEBASE,
                    File.type == "folder",
                    File.name == kb.name,
                ],
                {"name": req["name"]},
            )

        if req["name"].lower() != kb.name.lower() and len(
            KnowledgebaseService.query(
                name=req["name"],
                tenant_id=kb.tenant_id,
                status=StatusEnum.VALID.value,
            )
        ) >= 1:
            return get_data_error_result(message="Duplicated dataset name.")

        del req["kb_id"]
        if not KnowledgebaseService.update_by_id(kb.id, req):
            return get_data_error_result()

        if kb.pagerank != req.get("pagerank", 0):
            if req.get("pagerank", 0) > 0:
                settings.docStoreConn.update(
                    {"kb_id": kb.id},
                    {PAGERANK_FLD: req["pagerank"]},
                    search.index_name(kb.tenant_id),
                    kb.id,
                )
            else:
                settings.docStoreConn.update(
                    {"exists": PAGERANK_FLD},
                    {"remove": PAGERANK_FLD},
                    search.index_name(kb.tenant_id),
                    kb.id,
                )

        e, kb = KnowledgebaseService.get_by_id(kb.id)
        if not e:
            return get_data_error_result(message="Database error (Knowledgebase rename)!")
        kb = kb.to_dict()
        kb.update(req)
        return get_json_result(data=kb)
    except Exception as e:
        return server_error_response(e)


@manager.route('/retrieval_test', methods=['POST'])
@require_km_token
@validate_request("kb_id", "question")
async def retrieval_test_public():
    req = await get_request_json() or {}
    page = int(req.get("page", 1))
    size = int(req.get("size", 30))
    question = req["question"]
    kb_ids = req["kb_id"]
    if isinstance(kb_ids, str):
        kb_ids = [kb_ids]
    if not kb_ids:
        return get_json_result(
            data=False,
            message='Please specify dataset firstly.',
            code=RetCode.DATA_ERROR,
        )

    doc_ids = req.get("doc_ids", [])
    use_kg = req.get("use_kg", False)
    top = int(req.get("top_k", 1024))
    langs = req.get("cross_languages", [])

    try:
        # resolve tenant from kb
        e, kb = KnowledgebaseService.get_by_id(kb_ids[0])
        if not e:
            return get_data_error_result(message="Knowledgebase not found!")
        tenant_id = kb.tenant_id

        local_doc_ids = list(doc_ids) if doc_ids else []
        meta_data_filter = req.get("meta_data_filter") or {}
        chat_mdl = None
        if meta_data_filter.get("method") in ["auto", "semi_auto"]:
            chat_mdl = LLMBundle(tenant_id, LLMType.CHAT)

        if meta_data_filter:
            metas = DocumentService.get_meta_by_kbs(kb_ids)
            local_doc_ids = _run_async(
                apply_meta_data_filter(meta_data_filter, metas, question, chat_mdl, local_doc_ids)
            )

        _question = question
        if langs:
            _question = _run_async(cross_languages(tenant_id, None, _question, langs))

        embd_mdl = LLMBundle(tenant_id, LLMType.EMBEDDING.value, llm_name=kb.embd_id)

        rerank_mdl = None
        if req.get("rerank_id"):
            rerank_mdl = LLMBundle(tenant_id, LLMType.RERANK.value, llm_name=req["rerank_id"])

        if req.get("keyword", False):
            chat_mdl = LLMBundle(tenant_id, LLMType.CHAT)
            _question += _run_async(keyword_extraction(chat_mdl, _question))

        labels = label_question(_question, [kb])
        ranks = settings.retriever.retrieval(
            _question,
            embd_mdl,
            [tenant_id],
            kb_ids,
            page,
            size,
            float(req.get("similarity_threshold", 0.0)),
            float(req.get("vector_similarity_weight", 0.3)),
            top,
            local_doc_ids,
            rerank_mdl=rerank_mdl,
            highlight=req.get("highlight", False),
            rank_feature=labels,
        )
        if use_kg:
            ck = settings.kg_retriever.retrieval(
                _question,
                [tenant_id],
                kb_ids,
                embd_mdl,
                LLMBundle(tenant_id, LLMType.CHAT),
            )
            if ck.get("content_with_weight"):
                ranks["chunks"].insert(0, ck)
        ranks["chunks"] = settings.retriever.retrieval_by_children(ranks["chunks"], [tenant_id])

        for c in ranks["chunks"]:
            c.pop("vector", None)
        ranks["labels"] = labels
        return get_json_result(data=ranks)
    except Exception as e:
        if str(e).find("not_found") > 0:
            return get_json_result(
                data=False,
                message='No chunk found! Check the chunk status please!',
                code=RetCode.DATA_ERROR,
            )
        return server_error_response(e)


@manager.route('/<kb_id>/tags', methods=['GET'])
@require_km_token
def list_tags_public(kb_id):
    e, kb = KnowledgebaseService.get_by_id(kb_id)
    if not e:
        return get_data_error_result(message="Knowledgebase not found!")
    tags = settings.retriever.all_tags(kb.tenant_id, [kb_id])
    return get_json_result(data=tags)


@manager.route('/tags', methods=['GET'])
@require_km_token
def list_tags_from_kbs_public():
    kb_ids = request.args.get("kb_ids", "").split(",")
    kb_ids = [kb_id for kb_id in kb_ids if kb_id]
    if not kb_ids:
        return get_json_result(data=[])
    tenant_ids = []
    for kb_id in kb_ids:
        e, kb = KnowledgebaseService.get_by_id(kb_id)
        if not e:
            continue
        tenant_ids.append(kb.tenant_id)
    tags = []
    for tenant_id in set(tenant_ids):
        tags += settings.retriever.all_tags(tenant_id, kb_ids)
    return get_json_result(data=tags)


@manager.route('/<kb_id>/rm_tags', methods=['POST'])
@require_km_token
async def rm_tags_public(kb_id):
    req = await get_request_json() or {}
    e, kb = KnowledgebaseService.get_by_id(kb_id)
    if not e:
        return get_data_error_result(message="Knowledgebase not found!")
    for t in req.get("tags", []):
        settings.docStoreConn.update(
            {"tag_kwd": t, "kb_id": [kb_id]},
            {"remove": {"tag_kwd": t}},
            search.index_name(kb.tenant_id),
            kb_id,
        )
    return get_json_result(data=True)


@manager.route('/<kb_id>/rename_tag', methods=['POST'])
@require_km_token
async def rename_tags_public(kb_id):
    req = await get_request_json() or {}
    e, kb = KnowledgebaseService.get_by_id(kb_id)
    if not e:
        return get_data_error_result(message="Knowledgebase not found!")
    settings.docStoreConn.update(
        {"tag_kwd": req.get("from_tag"), "kb_id": [kb_id]},
        {"remove": {"tag_kwd": (req.get("from_tag") or "").strip()}, "add": {"tag_kwd": req.get("to_tag")}},
        search.index_name(kb.tenant_id),
        kb_id,
    )
    return get_json_result(data=True)

@manager.route("/document/create", methods=["POST"])
@validate_request("name", "kb_id")
@require_km_token
async def create_public_document():
    req = await get_request_json()
    kb_id = req["kb_id"]
    if not kb_id:
        return get_data_error_result(message='Lack of "KB ID"')
    if len(req["name"].encode("utf-8")) > FILE_NAME_LEN_LIMIT:
        return get_data_error_result(message=f"File name must be {FILE_NAME_LEN_LIMIT} bytes or less.")
    if req["name"].strip() == "":
        return get_data_error_result(message="File name can't be empty.")
    req["name"] = req["name"].strip()
    try:
        e, kb = KnowledgebaseService.get_by_id(kb_id)
        if not e:
            return get_data_error_result(message="Can't find this knowledgebase!")
        if DocumentService.query(name=req["name"], kb_id=kb_id):
            return get_data_error_result(message="Duplicated document name in the same knowledgebase.")
        doc = DocumentService.insert(
            {
                "id": get_uuid(), "kb_id": kb.id, "parser_id": kb.parser_id,
                "parser_config": kb.parser_config, "created_by": kb.created_by,
                "type": FileType.VIRTUAL, "name": req["name"], "location": "", "size": 0,
            }
        )
        return get_json_result(data=doc.to_json())
    except Exception as e:
        return server_error_response(e)

@manager.route("/document/upload/<kb_id>", methods=["POST"])
@require_km_token
async def upload_public_document(kb_id: str):
    if not kb_id:
        return get_data_error_result(message='Lack of "KB ID"')
    files = await request.files
    if "file" not in files:
        return get_data_error_result(message="No file part in request!")
    file_objs = files.getlist("file")
    for file_obj in file_objs:
        if file_obj.filename == "":
            return get_data_error_result(message="No file selected!")
        if len(file_obj.filename.encode("utf-8")) > FILE_NAME_LEN_LIMIT:
            return get_data_error_result(message=f"File name must be {FILE_NAME_LEN_LIMIT} bytes or less.")
    try:
        e, kb = KnowledgebaseService.get_by_id(kb_id)
        if not e:
            return get_data_error_result(message=f"Knowledge base with id {kb_id} not found.")
        err, files = FileService.upload_document(kb, file_objs, kb.created_by)
        if err:
            return get_data_error_result(message="\n".join(err))
        if not files:
            return get_data_error_result(message="File format issue or file is corrupted.")
        


        # 【【【關鍵修改 2/3：添加自動解析的邏輯】】】
        # bucket = os.environ.get("MINIO_BUCKET", "ragflow")
        # for doc_dict, _ in files:
        #     # 文件上傳後，其狀態預設為 PENDING。我們在此手動更新為 RUNNING，
        #     # 以確保 UI 能即時反饋「解析中」的狀態。
        #     DocumentService.update_by_id(doc_dict["id"], {"run": TaskStatus.RUNNING.value})
        #     # 將解析任務加入佇列
        #     queue_tasks(doc_dict, bucket, doc_dict['location'], 0)

        files_json = [f[0] for f in files]
        return get_json_result(data=files_json)
    except Exception as e:
        return server_error_response(e)

@manager.route("/document/rm", methods=["POST"])
@validate_request("doc_ids")
@require_km_token
async def rm_public_document():
    req = await get_request_json()
    doc_ids = req["doc_ids"]
    if not isinstance(doc_ids, list):
        return get_data_error_result(message="doc_ids must be a list.")
    try:
        for doc_id in doc_ids:
            e, doc = DocumentService.get_by_id(doc_id)
            if not e: continue
            tenant_id = DocumentService.get_tenant_id(doc.id)
            if not tenant_id: continue
            DocumentService.remove_document(doc, tenant_id)
        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)

@manager.route("/document/run", methods=["POST"])
@validate_request("doc_ids", "run_type")
@require_km_token
async def run_public_document():
    req = await get_request_json()
    doc_ids = req.get("doc_ids")
    run_type = req.get("run_type")
    if not isinstance(doc_ids, list):
        return get_data_error_result(message="doc_ids must be a list.")

    try:
        if run_type == "rerun":
            for doc_id in doc_ids:
                e, doc = DocumentService.get_by_id(doc_id)
                if not e: continue

                tenant_id = DocumentService.get_tenant_id(doc.id)
                if not tenant_id: continue

                # 1. 刪除向量數據庫中的舊 chunks (如果存在)
                if settings.docStoreConn.index_exist(search.index_name(tenant_id), doc.kb_id):
                    settings.docStoreConn.delete({"doc_id": doc.id}, search.index_name(tenant_id), doc.kb_id)

                # 2. 刪除舊的 Task 紀錄
                TaskService.filter_delete([Task.doc_id == doc_id])

                # 3. 如果文件之前已完成，則重置知識庫中的計數
                if doc.run == TaskStatus.DONE.value:
                    DocumentService.clear_chunk_num_when_rerun(doc.id)

                # 4. 更新文件狀態為「正在運行」，並重置進度
                info = {
                    "run": TaskStatus.RUNNING.value,
                    "progress": 0,
                    "progress_msg": ""
                }
                DocumentService.update_by_id(doc_id, info)

                # 5. 重新將解析任務加入隊列
                e, updated_doc = DocumentService.get_by_id(doc_id)
                if not e: continue
                # bucket = os.environ.get("MINIO_BUCKET", "ragflow")
                # queue_tasks(updated_doc.to_dict(), bucket, updated_doc.location, 0)
                bucket, name = File2DocumentService.get_storage_address(doc_id=updated_doc.id)
                queue_tasks(updated_doc.to_dict(), bucket, name, 0)

        elif run_type == "cancel":
            for doc_id in doc_ids:
                DocumentService.update_by_id(doc_id, {"run": TaskStatus.CANCEL.value})
        else:
            return get_data_error_result(message=f"Unsupported run_type: {run_type}")

        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)
@manager.route("/document/rename", methods=["POST"])
@validate_request("doc_id", "name")
@require_km_token
async def rename_public_document():
    req = await get_request_json()
    doc_id = req["doc_id"]
    new_name = req["name"].strip()

    if not doc_id:
        return get_data_error_result(message='Lack of "Document ID"')

    if len(new_name.encode("utf-8")) > FILE_NAME_LEN_LIMIT:
        return get_data_error_result(
            message=f"File name must be {FILE_NAME_LEN_LIMIT} bytes or less."
        )

    if not new_name:
        return get_data_error_result(message="File name can't be empty.")

    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found.")

        # 檢查在同一個知識庫中，新名稱是否已存在 (且不是目前的文件)
        existing_doc = DocumentService.query(name=new_name, kb_id=doc.kb_id)
        if existing_doc and existing_doc[0].id != doc_id:
            return get_data_error_result(
                message="Duplicated document name in the same knowledgebase."
            )

        DocumentService.update_by_id(doc_id, {"name": new_name})
        return get_json_result(data=True)

    except Exception as e:
        return server_error_response(e)


@manager.route("/document/change_status", methods=["POST"])
@validate_request("doc_id", "status")
@require_km_token
async def change_status_public_document():
    req = await get_request_json()
    doc_id = req["doc_id"]
    status_str = req["status"]

    # 【修改 1/3】: 將驗證條件從 ["valid", "invalid"] 改為 ["1", "0"]
    if status_str not in ["1", "0"]:
        return get_data_error_result(message='"status" must be either "1" or "0"!')
    
    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found.")

        # 【修改 2/3】: 更新主資料庫時，直接使用傳入的 "1" 或 "0"
        # 由於前端傳來的就是 "1" 或 "0"，這裡無需變更，語意上已是正確的
        if not DocumentService.update_by_id(doc_id, {"status": status_str}):
            return get_data_error_result(message="Database error (Document update)!")

        # 【修改 3/3】: 同步更新搜尋引擎索引時，將 "1" 或 "0" 的字串轉為整數
        status_int = int(status_str)
        tenant_id = DocumentService.get_tenant_id(doc.id)
        if tenant_id:
            e, kb = KnowledgebaseService.get_by_id(doc.kb_id)
            if e:
                settings.docStoreConn.update(
                    {"doc_id": doc_id}, 
                    {"available_int": status_int}, 
                    search.index_name(tenant_id), 
                    kb.id
                )
        
        return get_json_result(data=True)

    except Exception as e:
        return server_error_response(e)


@manager.route("/document/change_parser", methods=["POST"])
@validate_request("doc_id", "parser_id", "parser_config")
@require_km_token
async def change_parser_public():
    req = await get_request_json()
    doc_id = req["doc_id"]
    parser_id = req["parser_id"]
    parser_config = req["parser_config"]

    try:
        DocumentService.update_by_id(doc_id, {
            "parser_id": parser_id,
            "parser_config": parser_config
        })
        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)


@manager.route("/document/set_meta", methods=["POST"])
@validate_request("doc_id", "meta")
@require_km_token
async def set_meta_public():
    req = await get_request_json()
    doc_id = req["doc_id"]
    
    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found.")
        
        meta = req["meta"]
        if not isinstance(meta, dict):
             return get_data_error_result(message='Meta data should be a dictionary.')

        meta_fields = doc.meta_fields if doc.meta_fields else {}
        if req.get("meta_as_keywords", False):
            meta_fields["meta_as_keywords"] = "true"
        else:
            if "meta_as_keywords" in meta_fields: del meta_fields["meta_as_keywords"]
        meta_fields["__meta__"] = meta

        DocumentService.update_by_id(doc_id, {"meta_fields": meta_fields})
        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)



@manager.route('/chunk/list', methods=['POST'])
@validate_request("doc_id")
@require_km_token
async def list_chunks_public():
    req = await get_request_json()
    doc_id = req["doc_id"]
    page = int(req.get("page", 1))
    size = int(req.get("size", 30))
    question = req.get("keywords", "")
    try:
        # 依據：參考 chunk_app.py:list_chunk()
        # 改造：透過 doc_id 查詢 tenant_id，而非依賴 current_user
        tenant_id = DocumentService.get_tenant_id(doc_id)
        if not tenant_id:
            return get_data_error_result(message="Tenant not found!")

        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found!")

        kb_ids = KnowledgebaseService.get_kb_ids(tenant_id)
        query = {
            "doc_ids": [doc_id], "page": page, "size": size, "question": question, "sort": True
        }
        if "available_int" in req:
            query["available_int"] = int(req["available_int"])

        sres = settings.retriever.search(query, search.index_name(tenant_id), kb_ids, highlight=True)
        res = {"total": sres.total, "chunks": [], "doc": doc.to_dict()}
        for id in sres.ids:
            d = {
                "chunk_id": id,
                "content_with_weight": rmSpace(sres.highlight[id]) if question and id in sres.highlight else sres.field[id].get("content_with_weight", ""),
                "doc_id": sres.field[id]["doc_id"],
                "docnm_kwd": sres.field[id]["docnm_kwd"],
                "important_kwd": sres.field[id].get("important_kwd", []),
                "question_kwd": sres.field[id].get("question_kwd", []),
                "image_id": sres.field[id].get("img_id", ""),
                "available_int": int(sres.field[id].get("available_int", 1)),
                "positions": sres.field[id].get("position_int", []),
            }
            res["chunks"].append(d)
        return get_json_result(data=res)
    except Exception as e:
        if str(e).find("not_found") > 0:
            return get_json_result(data=False, message='No chunk found!', code=settings.RetCode.DATA_ERROR)
        return server_error_response(e)

@manager.route('/chunk/set', methods=['POST'])
@validate_request("doc_id", "chunk_id", "content_with_weight")
@require_km_token
async def set_chunk_public():
    req = await get_request_json()
    content = req["content_with_weight"]

    if not content or not content.strip():
        return get_data_error_result(message="Chunk content cannot be empty.")

    try:
        tenant_id = DocumentService.get_tenant_id(req["doc_id"])
        if not tenant_id: return get_data_error_result(message="Tenant not found!")

        e, doc = DocumentService.get_by_id(req["doc_id"])
        if not e: return get_data_error_result(message="Document not found!")

        # 【【【核心修正】】】: 與 create 函式保持一致的 embd_id 獲取邏輯
        e, kb = KnowledgebaseService.get_by_id(doc.kb_id)
        if not e: return get_data_error_result(message="Knowledgebase not found!")
        embd_id = kb.embd_id
        if not embd_id: return get_data_error_result(message="Embedding model is not configured for this knowledgebase.")

        d = { "id": req["chunk_id"], "content_with_weight": req["content_with_weight"] }
        d["content_ltks"] = rag_tokenizer.tokenize(req["content_with_weight"])
        d["content_sm_ltks"] = rag_tokenizer.fine_grained_tokenize(d["content_ltks"])
        if "important_kwd" in req:
            d["important_kwd"] = req["important_kwd"]
            d["important_tks"] = rag_tokenizer.tokenize(" ".join(req["important_kwd"]))

        embd_mdl = LLMBundle(tenant_id, LLMType.EMBEDDING, embd_id)
        v, c = embd_mdl.encode([doc.name, req["content_with_weight"]])
        v = 0.1 * v[0] + 0.9 * v[1]
        d["q_%d_vec" % len(v)] = v.tolist()
        settings.docStoreConn.update({"id": req["chunk_id"]}, d, search.index_name(tenant_id), doc.kb_id)
        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)

@manager.route('/chunk/rm', methods=['POST'])
@validate_request("chunk_ids", "doc_id")
@require_km_token
async def rm_chunk_public():
    req = await get_request_json()
    doc_id = req["doc_id"]
    chunk_ids = req["chunk_ids"]

    try:
        tenant_id = DocumentService.get_tenant_id(doc_id)
        if not tenant_id:
            return get_data_error_result(message="Tenant not found!")

        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found!")

        if not settings.docStoreConn.delete({"id": chunk_ids}, search.index_name(tenant_id), doc.kb_id):
            return get_data_error_result(message="Index updating failure")

        # ✨ 【【【最終、關鍵的後端修正】】】 ✨
        # 在刪除 chunk 後，從資料庫中更新父文件的 chunk 數量
        chunk_count_to_decrement = len(chunk_ids)
        if chunk_count_to_decrement > 0:
            DocumentService.decrement_chunk_num(
                doc_id=doc_id, 
                kb_id=doc.kb_id, 
                token_num=0, # 為簡化起見，暫不精確計算 token 數
                chunk_num=chunk_count_to_decrement, 
                duration=0
            )

        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)

@manager.route("/document/thumbnails", methods=["GET"])
@require_km_token
def public_document_thumbnails():
    doc_id = request.args.get("doc_id")
    if not doc_id:
        return get_data_error_result(message="doc_id is required.")
    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found.")

        # 【【【核心修正】】】:
        # 呼叫的服務從 FileService 改為 DocumentService
        # 並且參數需要是一個列表 [doc.id]
        thumbs = DocumentService.get_thumbnails([doc.id])

        return get_json_result(data=thumbs)
    except Exception as e:
        import logging
        logging.error(f"Error in public_document_thumbnails for doc_id {doc_id}: {e}")
        return server_error_response(e)
@manager.route("/document/get/<doc_id>", methods=["GET"])
@require_km_token
async def get_public_document(doc_id):
    """
    Handle public document download requests.
    """
    if not doc_id:
        return get_data_error_result(message="Document ID is required.")

    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e:
            return get_data_error_result(message="Document not found.", code=404)

        if doc.type == FileType.VIRTUAL.value:
            return get_data_error_result(message="Virtual documents cannot be downloaded.")

        doc_id, doc_location = File2DocumentService.get_storage_address(doc_id=doc.id)
        file_content = settings.STORAGE_IMPL.get(doc_id, doc_location)

        if file_content is None:
            return get_data_error_result(message="File content not found in storage.", code=404)

        return await send_file(
            io.BytesIO(file_content),
            as_attachment=True,
            attachment_filename=doc.name,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return server_error_response(e)

import hashlib
import datetime
from rag.nlp import rag_tokenizer
from common.constants import LLMType
from api.db.services.llm_service import LLMBundle
@manager.route('/chunk/create', methods=['POST'])
@validate_request("doc_id", "content_with_weight")
@require_km_token
async def public_create_chunk():
    req = await get_request_json()
    doc_id = req["doc_id"]
    content = req["content_with_weight"]

    if not content or not content.strip():
        return get_data_error_result(message="Chunk content cannot be empty.")


    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e: return get_data_error_result(message="Document not found!")

        tenant_id = DocumentService.get_tenant_id(doc.id)
        if not tenant_id: return get_data_error_result(message="Tenant not found!")

        # 【【【核心修正】】】: 透過知識庫獲取 embd_id
        # 【2】透過 doc.kb_id 查詢知識庫
        e, kb = KnowledgebaseService.get_by_id(doc.kb_id)
        if not e: return get_data_error_result(message="Knowledgebase not found!")

        embd_id = kb.embd_id
        # 【【【核心修正】】】: 增加對 embd_id 的存在性檢查
        if not embd_id: return get_data_error_result(message="Embedding model is not configured for this knowledgebase.")


        # 【3】從知識庫物件 kb 中獲取 embd_id
        embd_id = kb.embd_id

        hasher = hashlib.sha256()
        hasher.update((content + doc.id).encode("utf-8"))
        chunk_id = hasher.hexdigest()

        d = {
            "id": chunk_id,
            "doc_id": doc.id,
            "kb_id": [doc.kb_id],
            "docnm_kwd": doc.name,
            "content_with_weight": content,
            "content_ltks": rag_tokenizer.tokenize(content),
            "title_tks": rag_tokenizer.tokenize(doc.name),
            "create_time": str(datetime.datetime.now()).replace("T", " ")[:19],
            "create_timestamp_flt": datetime.datetime.now().timestamp(),
        }
        d["content_sm_ltks"] = rag_tokenizer.fine_grained_tokenize(d["content_ltks"])

        # Vectorize
        embd_mdl = LLMBundle(tenant_id, LLMType.EMBEDDING, embd_id) # 【4】現在 embd_id 是正確的了
        v, c = embd_mdl.encode([doc.name, content])
        v = 0.1 * v[0] + 0.9 * v[1]
        d["q_%d_vec" % len(v)] = v.tolist()

        settings.docStoreConn.insert([d], search.index_name(tenant_id), doc.kb_id)
        DocumentService.increment_chunk_num(doc.id, doc.kb_id, c, 1, 0)

        return get_json_result(data={"chunk_id": chunk_id})
    except Exception as e:
        return server_error_response(e)


@manager.route('/chunk/switch', methods=['POST'])
@validate_request("chunk_ids", "available_int", "doc_id")
@require_km_token
async def switch_chunk_public():
    req = await get_request_json()
    doc_id = req["doc_id"]
    chunk_ids = req["chunk_ids"]
    available_int = int(req["available_int"])

    try:
        e, doc = DocumentService.get_by_id(doc_id)
        if not e: return get_data_error_result(message="Document not found!")

        tenant_id = DocumentService.get_tenant_id(doc_id)
        if not tenant_id: return get_data_error_result(message="Tenant not found!")

        for cid in chunk_ids:
            success = settings.docStoreConn.update(
                {"id": cid},
                {"available_int": available_int},
                search.index_name(tenant_id),
                doc.kb_id
            )
            if not success:
                return get_data_error_result(message=f"Index updating failure for chunk_id: {cid}")

        # 【【【最終、關鍵的修正：強制刷新索引】】】
        # 在所有更新完成後，強制 Elasticsearch 刷新對應的索引
        # 這確保了後續的搜尋請求能夠立刻讀取到最新的資料
        settings.docStoreConn.es.indices.refresh(index=search.index_name(tenant_id))

        return get_json_result(data=True)
    except Exception as e:
        return server_error_response(e)
