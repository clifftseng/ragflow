import os
import json
import base64
import logging
import binascii # 導入 binascii 以捕捉 Base64 解碼錯誤
import cryptography
import ast
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding # 只導入 padding
from cryptography.hazmat.primitives import hashes
# InvalidPadding 已棄用，我們捕捉更通用的異常
from cryptography.exceptions import InvalidSignature

logging.info(f"Cryptography library version: {cryptography.__version__}")

PRIVATE_KEY_PATH = "/ragflow/conf/private_key.pem"
_private_key = None

def load_private_key():
    """
    延遲載入 RSA 私鑰，確保只在需要時載入一次。
    """
    global _private_key
    if _private_key is None:
        if not PRIVATE_KEY_PATH or not os.path.exists(PRIVATE_KEY_PATH):
            logging.error(f"RSA private key file not found at path: {PRIVATE_KEY_PATH}")
            raise FileNotFoundError("RSA private key is not configured or not found.")

        with open(PRIVATE_KEY_PATH, "rb") as key_file:
            _private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None
            )
    return _private_key

def decrypt_token(encrypted_b64: str) -> dict:
    """
    使用 RSA 私鑰對 Base64 字串進行分段解密，並使用 PKCS1v1.5 填充。
    此函式完全對應前端範例的加密邏輯。
    """
    try:
        private_key = load_private_key()

        # 步驟 1: Base64 解碼
        # 範例中使用的是標準 Base64 編碼，而非 urlsafe 版本
        encrypted_bytes = base64.b64decode(encrypted_b64)

        # 步驟 2: 執行分段解密
        # 解密時的分段長度等於金鑰的位元組長度 (2048 bits -> 256 bytes)
        decrypt_fragment_length = private_key.key_size // 8
        decrypted_chunks = []
        offset = 0
        while offset < len(encrypted_bytes):
            chunk = encrypted_bytes[offset : offset + decrypt_fragment_length]
            decrypted_chunk = private_key.decrypt(
                chunk,
                padding.PKCS1v15() # 【【【核心修正 1/2】】】: 使用與加密時相同的 PKCS1v15 填充
            )
            decrypted_chunks.append(decrypted_chunk)
            offset += decrypt_fragment_length

        decrypted_data = b"".join(decrypted_chunks)
        decrypted_string = decrypted_data.decode('utf-8')

        # 步驟 3: 解析 JSON 字串, 這可以安全地解析使用單引號的類 JSON 字串（實為 Python 字典字面量）
        payload = ast.literal_eval(decrypted_string)
        return payload

    except (ValueError, TypeError, binascii.Error) as e:
        # 捕捉 Base64 解碼、JSON 解析等格式錯誤
        logging.error(f"Token decoding or parsing failed: {e}, encrypted_b64:{encrypted_b64}")
        raise ValueError("Invalid Token Format") from e
    except Exception as e:
        # 【【【核心修正 2/2】】】: 捕捉 cryptography 的解密錯誤及其他所有未知異常
        logging.error(f"Token decryption failed: {e}")
        raise ValueError("Invalid Token") from e