
import os
import json
import base64
import logging
# 【【【新增 cryptography 的 import】】】
import cryptography 
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
# 【【【修正】】】InvalidPadding 在較新版本中已棄用，直接捕捉通用異常即可
from cryptography.exceptions import InvalidSignature 

# 【【【新增日誌記錄】】】
logging.info(f"Cryptography library version: {cryptography.__version__}")

# 從環境變數讀取私鑰路徑

PRIVATE_KEY_PATH = "/ragflow/conf/private_key.pem"
_private_key = None

# ... (load_private_key 函式保持不變) ...
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

def decrypt_token(encrypted_token: str) -> dict:
    """
    使用 RSA 私鑰解密並驗證 Token。
    """
    try:
        private_key = load_private_key()

        encrypted_data = base64.urlsafe_b64decode(encrypted_token)

        decrypted_data = private_key.decrypt(
            encrypted_data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

        decrypted_string = decrypted_data.decode('utf-8')

        payload = json.loads(decrypted_string)
        return payload

    # 【【【修正】】】
    # 移除 InvalidPadding，因為它會被通用的 Exception 捕捉到
    # `cryptography.exceptions.InvalidTag` 是解密失敗時更常見的異常
    except (InvalidSignature, ValueError, TypeError, Exception) as e:
        logging.error(f"Token decryption failed: {e}")
        raise ValueError("Invalid Token") from e