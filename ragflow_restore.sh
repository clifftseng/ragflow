#!/bin/bash

# 設定錯誤處理和調試模式
set -e           # 任何命令失敗立即退出
set -u           # 遇到未定義變數會報錯並退出
set -x           # 啟用調試模式，顯示每個執行的命令
set -o pipefail  # 管道中任何命令失敗都會導致整個管道失敗

# ==============================================================================
# 步驟 0：要求使用者輸入還原的日期和時分秒
# ==============================================================================
echo "================================================"
echo "      RAGFlow 資料還原腳本"
echo "================================================"
read -p "請輸入要還原的備份日期 (YYYYMMDD，例如 20250716): " RESTORE_DATE
read -p "請輸入要還原的備份時分秒 (HHMMSS，例如 132453): " RESTORE_TIME_HMS

# 構建備份批次目錄的完整路徑
BACKUP_BATCH_DIR="/opt/backup/ragflow/${RESTORE_DATE}/${RESTORE_TIME_HMS}"

echo "確認您選擇的備份目錄是: ${BACKUP_BATCH_DIR}"

# 驗證備份目錄是否存在
if [ ! -d "${BACKUP_BATCH_DIR}" ]; then
    echo "錯誤：找不到指定的備份目錄 '${BACKUP_BATCH_DIR}'。"
    echo "請確認日期和時分秒輸入正確，並且該目錄確實存在。"
    exit 1
fi
echo "備份目錄已確認存在。"

# 進入 Docker Compose 檔案所在的目錄
cd /opt/ragflow/docker || { echo "錯誤：無法進入 /opt/ragflow/docker 目錄。請檢查路徑。"; exit 1; }

# ==============================================================================
# 變數設定 (獲取 Docker Volumes 的實際掛載路徑)
# ==============================================================================
echo "獲取 Docker Volumes 的實際掛載路徑..."

source .env
DOC_ENGINE_SETTING="${DOC_ENGINE:-elasticsearch}"

MYSQL_VOLUME_PATH=$(sudo docker volume inspect ragflow_mysql_data -f '{{ .Mountpoint }}' 2>/dev/null) || { echo "錯誤：無法獲取 MySQL Volume 路徑！"; exit 1; }
REDIS_VOLUME_PATH=$(sudo docker volume inspect ragflow_redis_data -f '{{ .Mountpoint }}' 2>/dev/null) || { echo "錯誤：無法獲取 Redis Volume 路徑！"; exit 1; }
MINIO_VOLUME_PATH=$(sudo docker volume inspect ragflow_minio_data -f '{{ .Mountpoint }}' 2>/dev/null) || { echo "錯誤：無法獲取 MinIO Volume 路徑！"; exit 1; }

ES_VOLUME_PATH=""
OS_VOLUME_PATH=""
INFINITY_VOLUME_PATH=""

if [[ "$DOC_ENGINE_SETTING" == "elasticsearch" ]]; then
    ES_VOLUME_PATH=$(sudo docker volume inspect ragflow_esdata01 -f '{{ .Mountpoint }}' 2>/dev/null) || { echo "警告：Elasticsearch Volume 'ragflow_esdata01' 不存在。請確認 DOC_ENGINE 設定正確。"; }
elif [[ "$DOC_ENGINE_SETTING" == "opensearch" ]]; then
    OS_VOLUME_PATH=$(sudo docker volume inspect ragflow_osdata01 -f '{{ .Mountpoint }}' 2>/dev/null) || { echo "警告：OpenSearch Volume 'ragflow_osdata01' 不存在。請確認 DOC_ENGINE 設定正確。"; }
elif [[ "$DOC_ENGINE_SETTING" == "infinity" ]]; then
    INFINITY_VOLUME_PATH=$(sudo docker volume inspect ragflow_infinity_data -f '{{ .Mountpoint }}' 2>/dev/null) || { echo "警告：Infinity Volume 'ragflow_infinity_data' 不存在。請確認 DOC_ENGINE 設定正確。"; }
fi

echo "MySQL Volume 路徑: $MYSQL_VOLUME_PATH"
echo "Redis Volume 路徑: $REDIS_VOLUME_PATH"
echo "MinIO Volume 路徑: $MINIO_VOLUME_PATH"
if [ ! -z "$ES_VOLUME_PATH" ]; then echo "Elasticsearch Volume 路徑: $ES_VOLUME_PATH"; fi
if [ ! -z "$OS_VOLUME_PATH" ]; then echo "OpenSearch Volume 路徑: $OS_VOLUME_PATH"; fi
if [ ! -z "$INFINITY_VOLUME_PATH" ]; then echo "Infinity Volume 路徑: $INFINITY_VOLUME_PATH"; fi

# ==============================================================================
# 步驟 1：停止所有 RAGFlow 服務 (還原前必須停止，確保資料靜止)
# ==============================================================================
echo "停止所有 Docker Compose 服務以確保資料一致性 (還原操作需要所有服務停止)..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml --profile elasticsearch --profile gpu down
echo "所有服務已停止。"

# ==============================================================================
# 步驟 2：逐一還原各組件資料
# ==============================================================================

# 2.1 還原 MySQL 資料庫
echo "開始還原 MySQL 資料庫..."
echo "清理現有 MySQL 資料卷內容: ${MYSQL_VOLUME_PATH}"
sudo rm -rf "${MYSQL_VOLUME_PATH}"/* || { echo "錯誤：無法清理 MySQL Volume！"; exit 1; }
sudo rm -rf "${MYSQL_VOLUME_PATH}"/.[!.]* || { echo "錯誤：無法清理 MySQL Volume 隱藏文件！"; exit 1; }
echo "現有 MySQL 資料已清理。"

echo "啟動 MySQL 服務以便還原資料..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d mysql
echo "等待 MySQL 服務啟動並健康 (最多 60 秒)..."
if ! timeout 60 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps mysql | grep "healthy"; do sleep 1; done'; then
    echo "錯誤：MySQL 服務未能健康啟動。還原失敗。"
    exit 1
fi
echo "MySQL 服務已健康運行。"

MYSQL_CONTAINER_ID=$(sudo docker ps -aqf "name=ragflow-mysql")
echo "等待 MySQL 內部準備好接受連接 (最多 30 秒)..."
if ! timeout 30 bash -c "sudo docker exec \"$MYSQL_CONTAINER_ID\" mysqladmin -u root -p\"infini_rag_flow\" ping > /dev/null 2>&1"; then
    echo "錯誤：MySQL 服務未能準備好接受連接。還原失敗。"
    exit 1
fi
echo "MySQL 服務已準備好接受連接。"

echo "在導入前清空並重建 rag_flow 資料庫..."
sudo docker exec "$MYSQL_CONTAINER_ID" mysql -u root -p"infini_rag_flow" -e "DROP DATABASE IF EXISTS rag_flow; CREATE DATABASE rag_flow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "錯誤：無法清空並重建 rag_flow 資料庫！"
    exit 1
fi
echo "rag_flow 資料庫已清空並重建完成。"

echo "導入 MySQL 備份檔案: ${BACKUP_BATCH_DIR}/mysql_backup.sql (將捕獲所有輸出)..."
MYSQL_BACKUP_FILE_IN_HOST="${BACKUP_BATCH_DIR}/mysql_backup.sql"
MYSQL_BACKUP_FILE_IN_CONTAINER="/tmp/mysql_backup_temp.sql"

if [ ! -f "${MYSQL_BACKUP_FILE_IN_HOST}" ]; then
    echo "錯誤：MySQL 備份檔案 '${MYSQL_BACKUP_FILE_IN_HOST}' 不存在。無法還原。"
    exit 1
fi

echo "將 MySQL 備份檔案複製到容器內部: ${MYSQL_BACKUP_FILE_IN_CONTAINER}..."
sudo docker cp "${MYSQL_BACKUP_FILE_IN_HOST}" "$MYSQL_CONTAINER_ID":"${MYSQL_BACKUP_FILE_IN_CONTAINER}"
if [ $? -ne 0 ]; then
    echo "錯誤：無法將備份檔案複製到 MySQL 容器內部！"
    exit 1
fi
echo "備份檔案已成功複製到容器內部。"

if ! sudo docker exec "$MYSQL_CONTAINER_ID" bash -c "mysql -u root -p\"infini_rag_flow\" --verbose rag_flow < \"${MYSQL_BACKUP_FILE_IN_CONTAINER}\" 2>&1" | tee "/tmp/mysql_import_details_$(date +%Y%m%d_%H%M%S).txt" > /dev/null; then
    echo "錯誤：MySQL 資料導入失敗！請檢查 /tmp/mysql_import_details_*.txt 獲取詳細資訊。"
    sudo docker exec "$MYSQL_CONTAINER_ID" rm "${MYSQL_BACKUP_FILE_IN_CONTAINER}"
    exit 1
fi
sudo docker exec "$MYSQL_CONTAINER_ID" rm "${MYSQL_BACKUP_FILE_IN_CONTAINER}"
echo "MySQL 資料還原完成。請檢查 /tmp/mysql_import_details_*.txt 以確認無任何錯誤或警告。"


# 2.2 還原 Redis 資料庫
echo "開始還原 Redis 資料庫..."
echo "停止 Redis 服務以便清理..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml stop redis || { echo "警告：停止 Redis 服務失敗，可能已經停止。繼續。"; }
echo "清理現有 Redis 資料卷內容: ${REDIS_VOLUME_PATH}"
sudo rm -rf "${REDIS_VOLUME_PATH}"/* || { echo "錯誤：無法清理 Redis Volume！"; exit 1; }
echo "現有 Redis 資料已清理。"

echo "複製 Redis 備份檔案到資料卷..."
if [ ! -f "${BACKUP_BATCH_DIR}/redis_dump.rdb" ]; then
    echo "警告：Redis 備份文件 '${BACKUP_BATCH_DIR}/redis_dump.rdb' 不存在。跳過 Redis 還原。"
else
    sudo cp "${BACKUP_BATCH_DIR}/redis_dump.rdb" "${REDIS_VOLUME_PATH}/dump.rdb"
    if [ $? -ne 0 ]; then
        echo "錯誤：Redis 備份文件複製失敗！"
        exit 1
    fi
    echo "Redis 備份檔案已複製。"
fi

echo "啟動 Redis 服務..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d redis
echo "等待 Redis 服務啟動並健康 (最多 60 秒)..."
if ! timeout 60 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps redis | grep "healthy"; do sleep 1; done'; then
    echo "錯誤：Redis 服務未能健康啟動。還原失敗。"
    exit 1
fi
echo "Redis 服務已健康運行。"
echo "Redis 資料還原完成。"

# 2.3 還原 MinIO 物件儲存
echo "開始還原 MinIO 物件儲存..."
echo "停止 MinIO 服務以便清理..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml stop minio || { echo "警告：停止 MinIO 服務失敗，可能已經停止。繼續。"; }
echo "清理現有 MinIO 資料卷內容: ${MINIO_VOLUME_PATH}"
sudo rm -rf "${MINIO_VOLUME_PATH}"/* || { echo "錯誤：無法清理 MinIO Volume！"; exit 1; }
echo "現有 MinIO 資料已清理。"

echo "複製 MinIO 備份資料到資料卷..."
MINIO_BACKUP_SOURCE_DIR="${BACKUP_BATCH_DIR}/minio_data_backup"
if [ -d "${MINIO_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${MINIO_BACKUP_SOURCE_DIR}")" ]; then
    sudo cp -a "${MINIO_BACKUP_SOURCE_DIR}/." "${MINIO_VOLUME_PATH}/"
elif [ -d "${MINIO_BACKUP_SOURCE_DIR}" ]; then
    echo "MinIO 備份目錄是空的，無需複製檔案。"
else
    echo "警告：MinIO 備份目錄 '${MINIO_BACKUP_SOURCE_DIR}' 不存在。跳過 MinIO 還原。"
fi
if [ $? -ne 0 ] && [ -d "${MINIO_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${MINIO_BACKUP_SOURCE_DIR}")" ]; then
    echo "錯誤：MinIO 備份文件複製失敗！"
    exit 1
fi
echo "MinIO 資料還原完成。"

echo "啟動 MinIO 服務..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d minio
echo "等待 MinIO 服務啟動並健康 (最多 60 秒)..."
if ! timeout 60 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps minio | grep "healthy"; do sleep 1; done'; then
    echo "錯誤：MinIO 服務未能健康啟動。還原失敗。"
    exit 1
fi
echo "MinIO 服務已健康運行。"


# 2.4 還原向量資料庫 (Elasticsearch/OpenSearch/Infinity)
if [[ "$DOC_ENGINE_SETTING" == "elasticsearch" ]]; then
    echo "開始還原 Elasticsearch 資料庫..."
    echo "停止 Elasticsearch 服務以便清理..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml stop es01 || { echo "警告：停止 Elasticsearch 服務失敗，可能已經停止。繼續。"; }
    echo "清理現有 Elasticsearch 資料卷內容: ${ES_VOLUME_PATH}"
    sudo rm -rf "${ES_VOLUME_PATH}"/* || { echo "錯誤：無法清理 Elasticsearch Volume！"; exit 1; }
    echo "現有 Elasticsearch 資料已清理。"

    echo "複製 Elasticsearch 備份資料到資料卷..."
    ES_BACKUP_SOURCE_DIR="${BACKUP_BATCH_DIR}/esdata_backup"
    # 【【【關鍵修正：還原 Elasticsearch 內部正確的數據目錄】】】
    # Elasticsearch 數據通常在其數據卷掛載點下的 indices/ (因為備份腳本就是這樣備份的)
    ES_ACTUAL_RESTORE_PATH="${ES_VOLUME_PATH}/indices" # <--- 還原到 ES Volume 根目錄下的 'indices'
    sudo mkdir -p "${ES_ACTUAL_RESTORE_PATH}" # 確保目標目錄存在
    echo "嘗試從 Elasticsearch 備份路徑複製: ${ES_BACKUP_SOURCE_DIR} -> ${ES_ACTUAL_RESTORE_PATH}/"
    if [ -d "${ES_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${ES_BACKUP_SOURCE_DIR}")" ]; then
        sudo cp -a "${ES_BACKUP_SOURCE_DIR}"/* "${ES_ACTUAL_RESTORE_PATH}"/ # 複製內容
    elif [ -d "${ES_BACKUP_SOURCE_DIR}" ]; then
        echo "Elasticsearch 備份目錄是空的，無需複製檔案。"
    else
        echo "警告：Elasticsearch 備份目錄 '${ES_BACKUP_SOURCE_DIR}' 不存在。跳過 Elasticsearch 還原。"
    fi
    if [ $? -ne 0 ] && [ -d "${ES_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${ES_BACKUP_SOURCE_DIR}")" ]; then
        echo "錯誤：Elasticsearch 備份文件複製失敗！"
        exit 1
    fi
    echo "Elasticsearch 資料還原完成。"

    echo "啟動 Elasticsearch 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d es01
    echo "等待 Elasticsearch 服務啟動並健康 (最多 120 秒)..."
    if ! timeout 120 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps es01 | grep "healthy"; do sleep 1; done'; then
        echo "錯誤：Elasticsearch 服務未能健康啟動。還原失敗。"
        exit 1
    fi
    echo "Elasticsearch 服務已健康運行。"

elif [[ "$DOC_ENGINE_SETTING" == "opensearch" ]]; then
    echo "開始還原 OpenSearch 資料庫..."
    echo "停止 OpenSearch 服務以便清理..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml stop opensearch01 || { echo "警告：停止 OpenSearch 服務失敗，可能已經停止。繼續。"; }
    echo "清理現有 OpenSearch 資料卷內容: ${OS_VOLUME_PATH}"
    sudo rm -rf "${OS_VOLUME_PATH}"/* || { echo "錯誤：無法清理 OpenSearch Volume！"; exit 1; }
    echo "現有 OpenSearch 資料已清理。"

    echo "複製 OpenSearch 備份資料到資料卷..."
    OS_BACKUP_SOURCE_DIR="${BACKUP_BATCH_DIR}/osdata_backup"
    OS_ACTUAL_RESTORE_PATH="${OS_VOLUME_PATH}/nodes/0/indices" # OpenSearch 數據通常在這裡
    sudo mkdir -p "${OS_ACTUAL_RESTORE_PATH}" # 確保目標目錄存在
    echo "嘗試從 OpenSearch 備份路徑複製: ${OS_BACKUP_SOURCE_DIR} -> ${OS_ACTUAL_RESTORE_PATH}/"
    if [ -d "${OS_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${OS_BACKUP_SOURCE_DIR}")" ]; then
        sudo cp -a "${OS_BACKUP_SOURCE_DIR}"/* "${OS_ACTUAL_RESTORE_PATH}"/
    elif [ -d "${OS_BACKUP_SOURCE_DIR}" ]; then
        echo "OpenSearch 備份目錄是空的，無需複製檔案。"
    else
        echo "警告：OpenSearch 備份目錄 '${OS_BACKUP_SOURCE_DIR}' 不存在。跳過 OpenSearch 還原。"
    fi
    if [ $? -ne 0 ] && [ -d "${OS_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${OS_BACKUP_SOURCE_DIR}")" ]; then
        echo "錯誤：OpenSearch 備份文件複製失敗！"
        exit 1
    fi
    echo "OpenSearch 資料備份完成。"

    echo "啟動 OpenSearch 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d opensearch01
    echo "等待 OpenSearch 服務啟動並健康 (最多 120 秒)..."
    if ! timeout 120 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps opensearch01 | grep "healthy"; do sleep 1; done'; then
        echo "錯誤：OpenSearch 服務未能健康啟動。還原失敗。"
        exit 1
    fi
    echo "OpenSearch 服務已健康運行。"

elif [[ "$DOC_ENGINE_SETTING" == "infinity" ]]; then
    echo "開始還原 Infinity 資料庫..."
    echo "停止 Infinity 服務以便清理..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml stop infinity || { echo "警告：停止 Infinity 服務失敗，可能已經停止。繼續。"; }
    echo "清理現有 Infinity 資料卷內容: ${INFINITY_VOLUME_PATH}"
    sudo rm -rf "${INFINITY_VOLUME_PATH}"/* || { echo "錯誤：無法清理 Infinity Volume！"; exit 1; }
    echo "現有 Infinity 資料已清理。"

    echo "複製 Infinity 備份資料到資料卷..."
    INFINITY_BACKUP_SOURCE_DIR="${BACKUP_BATCH_DIR}/infinity_data_backup"
    INFINITY_ACTUAL_RESTORE_PATH="${INFINITY_VOLUME_PATH}" # Infinity 可能直接在卷根目錄儲存數據
    sudo mkdir -p "${INFINITY_ACTUAL_RESTORE_PATH}" # 確保目標目錄存在
    echo "嘗試從 Infinity 備份路徑複製: ${INFINITY_BACKUP_SOURCE_DIR} -> ${INFINITY_ACTUAL_RESTORE_PATH}/"
    if [ -d "${INFINITY_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${INFINITY_BACKUP_SOURCE_DIR}")" ]; then
        sudo cp -a "${INFINITY_BACKUP_SOURCE_DIR}"/* "${INFINITY_ACTUAL_RESTORE_PATH}"/
    elif [ -d "${INFINITY_BACKUP_SOURCE_DIR}" ]; then
        echo "Infinity 備份目錄是空的，無需複製檔案。"
    else
        echo "警告：Infinity 備份目錄 '${INFINITY_BACKUP_SOURCE_DIR}' 不存在。跳過 Infinity 還原。"
    fi
    if [ $? -ne 0 ] && [ -d "${INFINITY_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${INFINITY_BACKUP_SOURCE_DIR}")" ]; then
        echo "錯誤：Infinity 備份文件複製失敗！"
        exit 1
    fi
    echo "Infinity 資料還原完成。"

    echo "啟動 Infinity 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d infinity
    echo "等待 Infinity 服務啟動並健康 (最多 120 秒)..."
    if ! timeout 120 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps infinity | grep "healthy"; do sleep 1; done'; then
        echo "錯誤：Infinity 服務未能健康啟動。還原失敗。"
        exit 1
    fi
    echo "Infinity 服務已健康運行。"
fi

# 2.5 還原日誌檔 (Logs)
echo "還原日誌檔..."
sudo rm -rf "/opt/ragflow/docker/ragflow-logs"/* || { echo "錯誤：無法清理日誌資料夾！"; exit 1; }
LOGS_BACKUP_SOURCE_DIR="${BACKUP_BATCH_DIR}/logs_backup"
if [ ! -d "/opt/ragflow/docker/ragflow-logs" ]; then
    sudo mkdir -p "/opt/ragflow/docker/ragflow-logs" || { echo "錯誤：無法創建日誌資料夾！"; exit 1; }
fi
if [ -d "${LOGS_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${LOGS_BACKUP_SOURCE_DIR}")" ]; then
    sudo cp -r "${LOGS_BACKUP_SOURCE_DIR}/." "/opt/ragflow/docker/ragflow-logs"/
elif [ -d "${LOGS_BACKUP_SOURCE_DIR}" ]; then
    echo "日誌備份目錄是空的，無需複製檔案。"
else
    echo "警告：日誌備份目錄 '${LOGS_BACKUP_SOURCE_DIR}' 不存在。跳過日誌還原。"
fi

if [ $? -ne 0 ] && [ -d "${LOGS_BACKUP_SOURCE_DIR}" ] && [ "$(ls -A "${LOGS_BACKUP_SOURCE_DIR}")" ]; then
    echo "錯誤：日誌檔還原複製失敗！"
    exit 1
fi
echo "日誌檔還原完成：${BACKUP_BATCH_DIR}/logs_backup"

echo "所有數據庫和相關文件還原操作已完成！"

# ==============================================================================
# 步驟 3：最終啟動所有 RAGFlow 服務 (確保所有服務都運行)
# ==============================================================================
echo "啟動所有 Docker Compose 服務..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml --profile elasticsearch --profile gpu up -d

if [ $? -ne 0 ]; then
    echo "錯誤：Docker 服務最終啟動失敗！"
    exit 1
fi

echo "請稍候片刻，等待服務完全啟動並健康。"
echo "您可以通過 'sudo docker ps' 和 'sudo docker compose ps' 查看服務狀態。"
echo "待服務啟動後，請訪問前端：http://localhost:9380"
echo "以及公開頁面：http://localhost/km/3d4b5a284cf711f0a52cf1daa3ae99b5/dataset (請替換為實際的知識庫 ID)"
