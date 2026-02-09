#
#  Public next-search endpoints protected by KM token (RSA + expiry),
#  matching 19.1_ak KM token verification behavior.
#
import json
import re
from functools import wraps

from quart import Blueprint, Response, request

from api.db.services.dialog_service import async_ask, gen_mindmap
from api.db.services.document_service import DocumentService
from api.db.services.knowledgebase_service import KnowledgebaseService
from api.db.services.llm_service import LLMBundle
from api.db.services.search_service import SearchService
from api.utils.api_utils import (
    get_data_error_result,
    get_json_result,
    get_request_json,
    server_error_response,
    validate_request,
    verify_url_token,
)
from common.constants import RetCode, LLMType
from common import settings
from rag.app.tag import label_question
from rag.prompts.template import load_prompt
from rag.prompts.generator import cross_languages, keyword_extraction
from common.metadata_utils import apply_meta_data_filter


manager = Blueprint("km_search", __name__)  # noqa: F821


def require_km_token_async(func):
    @wraps(func)
    async def decorated_function(*args, **kwargs):
        token = request.args.get("token")
        if not token:
            return get_json_result(code=403, message="Access Forbidden:Missing token.")
        if not verify_url_token(token):
            return get_json_result(code=403, message="Access Forbidden: Invalid or missing token.")
        return await func(*args, **kwargs)

    return decorated_function


@manager.route("/detail", methods=["GET"])  # noqa: F821
@require_km_token_async
async def detail():
    search_id = request.args.get("search_id")
    if not search_id:
        return get_data_error_result(message="search_id is required.")
    try:
        search = SearchService.get_detail(search_id)
        if not search:
            return get_data_error_result(message="Can't find this Search App!")
        return get_json_result(data=search)
    except Exception as e:
        return server_error_response(e)


@manager.route("/ask", methods=["POST"])  # noqa: F821
@require_km_token_async
@validate_request("question", "search_id")
async def ask():
    req = await get_request_json()
    search_id = req.get("search_id")
    search = SearchService.get_detail(search_id) if search_id else {}
    if not search:
        return get_data_error_result(message="Can't find this Search App!")

    search_config = search.get("search_config", {})
    kb_ids = search_config.get("kb_ids", [])
    if not kb_ids:
        return get_json_result(
            data=False,
            message="Please specify dataset firstly.",
            code=RetCode.DATA_ERROR,
        )

    tenant_id = search.get("tenant_id")

    async def stream():
        try:
            async for ans in async_ask(
                req["question"],
                kb_ids,
                tenant_id,
                search_config=search_config,
            ):
                yield "data:" + json.dumps(
                    {"code": 0, "message": "", "data": ans},
                    ensure_ascii=False,
                ) + "\n\n"
        except Exception as e:
            yield "data:" + json.dumps(
                {
                    "code": 500,
                    "message": str(e),
                    "data": {"answer": "**ERROR**: " + str(e), "reference": []},
                },
                ensure_ascii=False,
            ) + "\n\n"
        yield "data:" + json.dumps(
            {"code": 0, "message": "", "data": True},
            ensure_ascii=False,
        ) + "\n\n"

    resp = Response(stream(), mimetype="text/event-stream")
    resp.headers.add_header("Cache-control", "no-cache")
    resp.headers.add_header("Connection", "keep-alive")
    resp.headers.add_header("X-Accel-Buffering", "no")
    resp.headers.add_header("Content-Type", "text/event-stream; charset=utf-8")
    return resp


@manager.route("/related_questions", methods=["POST"])  # noqa: F821
@require_km_token_async
@validate_request("question", "search_id")
async def related_questions():
    req = await get_request_json()
    search_id = req.get("search_id")
    search = SearchService.get_detail(search_id) if search_id else {}
    if not search:
        return get_data_error_result(message="Can't find this Search App!")

    search_config = search.get("search_config", {})
    tenant_id = search.get("tenant_id")
    question = req["question"]

    chat_id = search_config.get("chat_id", "")
    chat_mdl = LLMBundle(tenant_id, LLMType.CHAT, chat_id)
    gen_conf = search_config.get("llm_setting", {"temperature": 0.9})
    prompt = load_prompt("related_question")
    ans = await chat_mdl.async_chat(
        prompt,
        [
            {
                "role": "user",
                "content": f"""
Keywords: {question}
Related search terms:
    """,
            }
        ],
        gen_conf,
    )
    return get_json_result(
        data=[
            re.sub(r"^[0-9]\. ", "", a)
            for a in ans.split("\n")
            if re.match(r"^[0-9]\. ", a)
        ]
    )


@manager.route("/mindmap", methods=["POST"])  # noqa: F821
@require_km_token_async
@validate_request("question", "search_id")
async def mindmap():
    req = await get_request_json()
    search_id = req.get("search_id")
    search = SearchService.get_detail(search_id) if search_id else {}
    if not search:
        return get_data_error_result(message="Can't find this Search App!")

    search_config = search.get("search_config", {})
    kb_ids = search_config.get("kb_ids", [])
    if not kb_ids:
        return get_json_result(
            data=False,
            message="Please specify dataset firstly.",
            code=RetCode.DATA_ERROR,
        )
    mind_map = await gen_mindmap(req["question"], kb_ids, search.get("tenant_id"), search_config)
    return get_json_result(data=mind_map)


@manager.route("/retrieval_test", methods=["POST"])  # noqa: F821
@require_km_token_async
@validate_request("question", "search_id")
async def retrieval_test():
    req = await get_request_json()
    search_id = req.get("search_id")
    search = SearchService.get_detail(search_id) if search_id else {}
    if not search:
        return get_data_error_result(message="Can't find this Search App!")

    search_config = search.get("search_config", {})
    kb_ids = search_config.get("kb_ids", [])
    if not kb_ids:
        return get_json_result(
            data=False,
            message="Please specify dataset firstly.",
            code=RetCode.DATA_ERROR,
        )

    page = int(req.get("page", 1))
    size = int(req.get("size", 30))
    question = req["question"]
    doc_ids = req.get("doc_ids", [])
    similarity_threshold = float(req.get("similarity_threshold", 0.0))
    vector_similarity_weight = float(req.get("vector_similarity_weight", 0.3))
    use_kg = req.get("use_kg", False)
    top = int(req.get("top_k", 1024))
    langs = req.get("cross_languages", [])

    async def _retrieval():
        local_doc_ids = list(doc_ids) if doc_ids else []
        tenant_ids = []
        _question = question

        meta_data_filter = search_config.get("meta_data_filter", {})
        chat_mdl = None
        if meta_data_filter.get("method") in ["auto", "semi_auto"]:
            chat_mdl = LLMBundle(search.get("tenant_id"), LLMType.CHAT, llm_name=search_config.get("chat_id", ""))

        if meta_data_filter:
            metas = DocumentService.get_meta_by_kbs(kb_ids)
            local_doc_ids = await apply_meta_data_filter(
                meta_data_filter, metas, _question, chat_mdl, local_doc_ids
            )

        # Resolve tenant_ids by kb ownership
        for kb_id in kb_ids:
            if KnowledgebaseService.query(tenant_id=search.get("tenant_id"), id=kb_id):
                tenant_ids.append(search.get("tenant_id"))
            else:
                return get_json_result(
                    data=False,
                    message="Only owner of dataset authorized for this operation.",
                    code=RetCode.OPERATING_ERROR,
                )

        e, kb = KnowledgebaseService.get_by_id(kb_ids[0])
        if not e:
            return get_data_error_result(message="Knowledgebase not found!")

        if langs:
            _question = await cross_languages(kb.tenant_id, None, _question, langs)

        embd_mdl = LLMBundle(kb.tenant_id, LLMType.EMBEDDING.value, llm_name=kb.embd_id)
        rerank_mdl = None
        if req.get("rerank_id"):
            rerank_mdl = LLMBundle(kb.tenant_id, LLMType.RERANK.value, llm_name=req["rerank_id"])

        if req.get("keyword", False):
            chat_mdl = LLMBundle(kb.tenant_id, LLMType.CHAT)
            _question += await keyword_extraction(chat_mdl, _question)

        labels = label_question(_question, [kb])
        ranks = settings.retriever.retrieval(
            _question,
            embd_mdl,
            tenant_ids,
            kb_ids,
            page,
            size,
            similarity_threshold,
            vector_similarity_weight,
            top,
            local_doc_ids,
            rerank_mdl=rerank_mdl,
            highlight=req.get("highlight"),
            rank_feature=labels,
        )
        if use_kg:
            ck = settings.kg_retriever.retrieval(
                _question,
                tenant_ids,
                kb_ids,
                embd_mdl,
                LLMBundle(kb.tenant_id, LLMType.CHAT),
            )
            if ck["content_with_weight"]:
                ranks["chunks"].insert(0, ck)

        for c in ranks["chunks"]:
            c.pop("vector", None)
        ranks["labels"] = labels
        return get_json_result(data=ranks)

    try:
        return await _retrieval()
    except Exception as e:
        if str(e).find("not_found") > 0:
            return get_json_result(
                data=False,
                message="No chunk found! Check the chunk status please!",
                code=RetCode.DATA_ERROR,
            )
        return server_error_response(e)
