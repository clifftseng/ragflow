#!/bin/bash

# 設定錯誤處理：任何命令失敗立即退出
set -e
# 設定未定義變數處理：如果遇到未定義變數，會報錯並退出
set -u

# ==============================================================================
# 變數設定
# ==============================================================================
CURRENT_DATE=$(date +%Y%m%d)
TIMESTAMP_HMS=$(date +%H%M%S)

DATE_BACKUP_ROOT="/opt/backup/ragflow/${CURRENT_DATE}"
BACKUP_BATCH_DIR="${DATE_BACKUP_ROOT}/${TIMESTAMP_HMS}"

cd /opt/ragflow/docker || { echo "錯誤：無法進入 /opt/ragflow/docker 目錄。請檢查路徑。"; exit 1; }

# ==============================================================================
# 前置步驟：建立巢狀備份目錄
# ==============================================================================
echo "檢查並建立備份目錄: ${BACKUP_BATCH_DIR}..."
sudo mkdir -p "${BACKUP_BATCH_DIR}" || { echo "錯誤：無法創建備份目錄 ${BACKUP_BATCH_DIR}！"; exit 1; }
sudo chown $(whoami):$(whoami) "${DATE_BACKUP_ROOT}" || { echo "錯誤：無法設置日期備份目錄所有者！"; exit 1; }
sudo chmod 755 "${DATE_BACKUP_ROOT}" || { echo "錯誤：無法設置日期備份目錄權限！"; exit 1; }
sudo chown $(whoami):$(whoami) "${BACKUP_BATCH_DIR}" || { echo "錯誤：無法設置時間備份目錄所有者！"; exit 1; }
sudo chmod 755 "${BACKUP_BATCH_DIR}" || { echo "錯誤：無法設置時間備份目錄權限！"; exit 1; }
echo "備份目錄 ${BACKUP_BATCH_DIR} 已準備就緒。"


# 獲取 Docker Volumes 的實際掛載路徑
echo "獲取 Docker Volumes 的實際掛載路徑..."
MYSQL_VOLUME_PATH=$(sudo docker volume inspect ragflow_mysql_data -f '{{ .Mountpoint }}') || { echo "錯誤：無法獲取 MySQL Volume 路徑！"; exit 1; }
REDIS_VOLUME_PATH=$(sudo docker volume inspect ragflow_redis_data -f '{{ .Mountpoint }}') || { echo "錯誤：無法獲取 Redis Volume 路徑！"; exit 1; }
MINIO_VOLUME_PATH=$(sudo docker volume inspect ragflow_minio_data -f '{{ .Mountpoint }}') || { echo "錯誤：無法獲取 MinIO Volume 路徑！"; exit 1; }

source .env
DOC_ENGINE_SETTING="${DOC_ENGINE:-elasticsearch}"
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
# 步驟 1：在應用程式運行中備份各組件資料 (Hot/Warm Backup)
# 針對需要冷備份（直接複製數據卷）的服務，將其短暫停止並重啟。
# ==============================================================================

# 1.1 MySQL 資料庫備份 (溫備份)
echo "備份 MySQL 資料庫 (溫備份)..."
MYSQL_CONTAINER_ID=$(sudo docker ps -aqf "name=ragflow-mysql")
if [ -z "$MYSQL_CONTAINER_ID" ]; then
    echo "錯誤：MySQL 容器未運行。無法執行溫備份。備份失敗。"
    exit 1
fi
echo "等待 MySQL 內部準備好接受連接 (最多 30 秒)..."
if ! timeout 30 bash -c "sudo docker exec \"$MYSQL_CONTAINER_ID\" mysqladmin -u root -p\"infini_rag_flow\" ping > /dev/null 2>&1"; then
    echo "錯誤：MySQL 服務未能準備好接受連接。備份失敗。"
    exit 1
fi
echo "MySQL 服務已準備好接受連接。"

sudo docker exec "$MYSQL_CONTAINER_ID" mysqldump -u root -p"infini_rag_flow" rag_flow > "${BACKUP_BATCH_DIR}/mysql_backup.sql"
if [ $? -ne 0 ]; then
    echo "錯誤：MySQL 備份失敗！請檢查權限和密碼。"
    exit 1
fi
echo "MySQL 備份完成：${BACKUP_BATCH_DIR}/mysql_backup.sql"


# 1.2 Redis 資料庫備份 (溫備份)
echo "備份 Redis 資料庫 (溫備份)..."
REDIS_CONTAINER_ID=$(sudo docker ps -aqf "name=ragflow-redis")
if [ -z "$REDIS_CONTAINER_ID" ]; then
    echo "錯誤：Redis 容器未運行。無法執行溫備份。備份失敗。"
    exit 1
fi

sudo docker exec "$REDIS_CONTAINER_ID" redis-cli -a "infini_rag_flow" BGSAVE > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "錯誤：Redis BGSAVE 命令失敗！"
    exit 1
fi
echo "等待 Redis BGSAVE 完成 (約 5 秒)..."
sleep 5
if ! sudo test -f "${REDIS_VOLUME_PATH}/dump.rdb"; then
    echo "錯誤：Redis 的 dump.rdb 文件未生成或不可見。備份失敗。"
    exit 1
fi
echo "複製 Redis 備份檔案到資料卷..."
sudo cp "${REDIS_VOLUME_PATH}/dump.rdb" "${BACKUP_BATCH_DIR}/redis_dump.rdb"
if [ $? -ne 0 ]; then
    echo "錯誤：Redis 備份文件複製失敗！"
    exit 1
fi
echo "Redis 備份完成：${BACKUP_BATCH_DIR}/redis_dump.rdb"


# 1.3 MinIO 物件儲存備份 (冷備份：停止服務，複製數據卷，再啟動)
echo "備份 MinIO 物件儲存 (冷備份：需要短暫停機 MinIO 服務)..."
echo "停止 MinIO 服務..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml stop minio || { echo "警告：停止 MinIO 服務失敗，可能已經停止。繼續。"; }
echo "MinIO 服務已停止。"

echo "清理舊的 MinIO 備份目標目錄 (如果存在)..."
sudo rm -rf "${BACKUP_BATCH_DIR}/minio_data_backup"
sudo mkdir -p "${BACKUP_BATCH_DIR}/minio_data_backup" || { echo "錯誤：無法創建 MinIO 備份目標目錄！"; exit 1; }

echo "複製 MinIO 資料卷內容到備份目錄: ${MINIO_VOLUME_PATH} -> ${BACKUP_BATCH_DIR}/minio_data_backup/"
if [ -d "${MINIO_VOLUME_PATH}" ] && [ "$(ls -A "${MINIO_VOLUME_PATH}")" ]; then
    sudo cp -a "${MINIO_VOLUME_PATH}/." "${BACKUP_BATCH_DIR}/minio_data_backup"/
elif [ -d "${MINIO_VOLUME_PATH}" ]; then
    echo "MinIO 資料卷目錄是空的，無需複製檔案。"
else
    echo "警告：MinIO 資料卷目錄 '${MINIO_VOLUME_PATH}' 不存在。跳過複製。"
fi
if [ $? -ne 0 ] && [ -d "${MINIO_VOLUME_PATH}" ] && [ "$(ls -A "${MINIO_VOLUME_PATH}")" ]; then
    echo "錯誤：MinIO 備份文件複製失敗！"
    exit 1
fi
echo "MinIO 資料備份完成。"

echo "啟動 MinIO 服務..."
sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d minio
echo "等待 MinIO 服務啟動並健康 (最多 60 秒)..."
if ! timeout 60 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps minio | grep "healthy"; do sleep 1; done'; then
    echo "錯誤：MinIO 服務未能健康啟動。備份失敗。"
    exit 1
fi
echo "MinIO 服務已健康運行。"


# 1.4 向量資料庫備份 (冷備份：停止服務，複製數據卷，再啟動)
if [[ "$DOC_ENGINE_SETTING" == "elasticsearch" ]]; then
    echo "備份 Elasticsearch 資料庫 (冷備份：需要短暫停機 Elasticsearch 服務)..."
    echo "停止 Elasticsearch 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml stop es01 || { echo "警告：停止 Elasticsearch 服務失敗，可能已經停止。繼續。"; }
    echo "Elasticsearch 服務已停止。"

    echo "清理舊的 Elasticsearch 備份目標目錄 (如果存在)..."
    sudo rm -rf "${BACKUP_BATCH_DIR}/esdata_backup"
    sudo mkdir -p "${BACKUP_BATCH_DIR}/esdata_backup" || { echo "錯誤：無法創建 Elasticsearch 備份目標目錄！"; exit 1; }

    # 【【【關鍵修正：備份 Elasticsearch 內部正確的數據目錄】】】
    # Elasticsearch 數據通常在其數據卷掛載點下的 indices/ (因為您的 ls 輸出顯示它在這裡)
    ES_ACTUAL_DATA_PATH="${ES_VOLUME_PATH}/indices" # <--- 修正為直接在 ES Volume 根目錄下的 'indices'
    echo "嘗試從 Elasticsearch 實際數據路徑複製: ${ES_ACTUAL_DATA_PATH} -> ${BACKUP_BATCH_DIR}/esdata_backup/"
    if [ -d "${ES_ACTUAL_DATA_PATH}" ] && [ "$(ls -A "${ES_ACTUAL_DATA_PATH}")" ]; then
        sudo cp -a "${ES_ACTUAL_DATA_PATH}"/* "${BACKUP_BATCH_DIR}/esdata_backup"/ # 複製內部內容
    elif [ -d "${ES_ACTUAL_DATA_PATH}" ]; then
        echo "Elasticsearch 資料卷的索引目錄 '${ES_ACTUAL_DATA_PATH}' 是空的，無需複製檔案。"
    else
        echo "警告：Elasticsearch 資料卷的索引目錄 '${ES_ACTUAL_DATA_PATH}' 不存在。跳過備份。"
    fi
    if [ $? -ne 0 ] && [ -d "${ES_ACTUAL_DATA_PATH}" ] && [ "$(ls -A "${ES_ACTUAL_DATA_PATH}")" ]; then
        echo "錯誤：Elasticsearch 備份文件複製失敗！"
        exit 1
    fi
    echo "Elasticsearch 資料備份完成。"

    echo "啟動 Elasticsearch 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d es01
    echo "等待 Elasticsearch 服務啟動並健康 (最多 120 秒)..."
    if ! timeout 120 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps es01 | grep "healthy"; do sleep 1; done'; then
        echo "錯誤：Elasticsearch 服務未能健康啟動。備份失敗。"
        exit 1
    fi
    echo "Elasticsearch 服務已健康運行。"

elif [[ "$DOC_ENGINE_SETTING" == "opensearch" ]]; then
    echo "備份 OpenSearch 資料庫 (冷備份：需要短暫停機 OpenSearch 服務)..."
    echo "停止 OpenSearch 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml stop opensearch01 || { echo "警告：停止 OpenSearch 服務失敗，可能已經停止。繼續。"; }
    echo "OpenSearch 服務已停止。"

    echo "清理舊的 OpenSearch 備份目標目錄 (如果存在)..."
    sudo rm -rf "${BACKUP_BATCH_DIR}/osdata_backup"
    sudo mkdir -p "${BACKUP_BATCH_DIR}/osdata_backup" || { echo "錯誤：無法創建 OpenSearch 備份目標目錄！"; exit 1; }

    # 【【【關鍵修正：備份 OpenSearch 內部正確的數據目錄】】】
    OS_ACTUAL_DATA_PATH="${OS_VOLUME_PATH}/nodes/0/indices" # OpenSearch 數據通常在這裡
    echo "嘗試從 OpenSearch 實際數據路徑複製: ${OS_ACTUAL_DATA_PATH} -> ${BACKUP_BATCH_DIR}/osdata_backup/"
    if [ -d "${OS_ACTUAL_DATA_PATH}" ] && [ "$(ls -A "${OS_ACTUAL_DATA_PATH}")" ]; then
        sudo cp -a "${OS_ACTUAL_DATA_PATH}"/* "${BACKUP_BATCH_DIR}/osdata_backup"/
    elif [ -d "${OS_ACTUAL_DATA_PATH}" ]; then
        echo "OpenSearch 資料卷的索引目錄 '${OS_ACTUAL_DATA_PATH}' 是空的，無需複製檔案。"
    else
        echo "警告：OpenSearch 資料卷的索引目錄 '${OS_ACTUAL_DATA_PATH}' 不存在。跳過備份。"
    fi
    if [ $? -ne 0 ] && [ -d "${OS_ACTUAL_DATA_PATH}" ] && [ "$(ls -A "${OS_ACTUAL_DATA_PATH}")" ]; then
        echo "錯誤：OpenSearch 備份文件複製失敗！"
        exit 1
    fi
    echo "OpenSearch 資料備份完成。"

    echo "啟動 OpenSearch 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d opensearch01
    echo "等待 OpenSearch 服務啟動並健康 (最多 120 秒)..."
    if ! timeout 120 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps opensearch01 | grep "healthy"; do sleep 1; done'; then
        echo "錯誤：OpenSearch 服務未能健康啟動。備份失敗。"
        exit 1
    fi
    echo "OpenSearch 服務已健康運行。"

elif [[ "$DOC_ENGINE_SETTING" == "infinity" ]]; then
    echo "備份 Infinity 資料庫 (冷備份：需要短暫停機 Infinity 服務)..."
    echo "停止 Infinity 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml stop infinity || { echo "警告：停止 Infinity 服務失敗，可能已經停止。繼續。"; }
    echo "Infinity 服務已停止。"

    echo "清理舊的 Infinity 備份目標目錄 (如果存在)..."
    sudo rm -rf "${BACKUP_BATCH_DIR}/infinity_data_backup"
    sudo mkdir -p "${BACKUP_BATCH_DIR}/infinity_data_backup" || { echo "錯誤：無法創建 Infinity 備份目標目錄！"; exit 1; }

    # 【【【關鍵修正：備份 Infinity 內部正確的數據目錄】】】
    INFINITY_ACTUAL_DATA_PATH="${INFINITY_VOLUME_PATH}" # Infinity 可能直接在卷根目錄儲存數據
    echo "嘗試從 Infinity 實際數據路徑複製: ${INFINITY_ACTUAL_DATA_PATH} -> ${BACKUP_BATCH_DIR}/infinity_data_backup/"
    if [ -d "${INFINITY_ACTUAL_DATA_PATH}" ] && [ "$(ls -A "${INFINITY_ACTUAL_DATA_PATH}")" ]; then
        sudo cp -a "${INFINITY_ACTUAL_DATA_PATH}"/* "${BACKUP_BATCH_DIR}/infinity_data_backup"/
    elif [ -d "${INFINITY_ACTUAL_DATA_PATH}" ]; then
        echo "Infinity 資料卷目錄是空的，無需複製檔案。"
    else
        echo "警告：Infinity 資料卷目錄 '${INFINITY_ACTUAL_DATA_PATH}' 不存在。跳過備份。"
    fi
    if [ $? -ne 0 ] && [ -d "${INFINITY_ACTUAL_DATA_PATH}" ] && [ "$(ls -A "${INFINITY_ACTUAL_DATA_PATH}")" ]; then
        echo "錯誤：Infinity 備份文件複製失敗！"
        exit 1
    fi
    echo "Infinity 資料備份完成。"

    echo "啟動 Infinity 服務..."
    sudo docker compose -p ragflow -f docker-compose-gpu.yml up -d infinity
    echo "等待 Infinity 服務啟動並健康 (最多 120 秒)..."
    if ! timeout 120 bash -c 'until sudo docker compose -p ragflow -f docker-compose-gpu.yml ps infinity | grep "healthy"; do sleep 1; done'; then
        echo "錯誤：Infinity 服務未能健康啟動。備份失敗。"
        exit 1
    fi
    echo "Infinity 服務已健康運行。"
fi

# 1.5 日誌檔 (Logs) 備份：
echo "備份日誌檔..."
sudo rm -rf "${BACKUP_BATCH_DIR}/logs_backup"
sudo mkdir -p "${BACKUP_BATCH_DIR}/logs_backup" || { echo "錯誤：無法創建日誌備份目錄！"; exit 1; }

if [ -d "/opt/ragflow/docker/ragflow-logs" ] && [ "$(ls -A "/opt/ragflow/docker/ragflow-logs")" ]; then
    sudo cp -r "/opt/ragflow/docker/ragflow-logs/"* "${BACKUP_BATCH_DIR}/logs_backup"/
elif [ -d "/opt/ragflow/docker/ragflow-logs" ]; then
    echo "日誌資料夾是空的，無需複製檔案。"
else
    echo "警告：日誌資料夾 '/opt/ragflow/docker/ragflow-logs' 不存在。跳過複製。"
fi

if [ $? -ne 0 ] && [ -d "/opt/ragflow/docker/ragflow-logs" ] && [ "$(ls -A "/opt/ragflow/docker/ragflow-logs")" ]; then
    echo "錯誤：日誌檔備份複製失敗！"
    exit 1
fi
echo "日誌檔備份完成：${BACKUP_BATCH_DIR}/logs_backup"

echo "所有數據庫和相關文件備份操作已完成！"

