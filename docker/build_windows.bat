cd ..
docker build --platform linux/amd64 --build-arg NEED_MIRROR=0 --build-arg LIGHTEN=1 -f Dockerfile -t ak-ragflow:0.19.1-gpu .
cd docker
docker compose -p ragflow -f docker-compose-gpu.yml --profile elasticsearch --profile gpu up -d
docker compose -p ragflow -f docker-compose-gpu.yml logs -f ragflow
