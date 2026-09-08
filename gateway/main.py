from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
import consul
import random
import os

from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://saas.networkspecialist.in:8007"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Consul
# ---------------------------------------------------------

CONSUL_HOST = os.getenv("CONSUL_HOST", "172.17.0.16")
CONSUL_PORT = int(os.getenv("CONSUL_PORT", "8500"))

c = consul.Consul(
    host=CONSUL_HOST,
    port=CONSUL_PORT
)


# ---------------------------------------------------------
# Service mapping
# ---------------------------------------------------------

SERVICE_MAP = {
    "user": "user-service",
    "table": "table-service",
    "inventory": "inventory-service",
    "order": "order-service",
    "billing": "billing-service",
}


# ---------------------------------------------------------
# Service discovery
# ---------------------------------------------------------

def discover_service(service_name: str) -> str:

    index, instances = c.health.service(
        service_name,
        passing=True
    )

    if not instances:
        raise RuntimeError(
            f"No healthy instances of '{service_name}'"
        )

    chosen = random.choice(instances)

    return (
        f"http://{chosen['Service']['Address']}:"
        f"{chosen['Service']['Port']}"
    )


# ---------------------------------------------------------
# Gateway
# ---------------------------------------------------------

@app.api_route(
    "/{prefix}/{full_path:path}",
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH"
    ]
)
async def gateway(
    prefix: str,
    full_path: str,
    request: Request
):

    service_name = SERVICE_MAP.get(prefix)

    if not service_name:
        return Response(
            content=f"Unknown service prefix '{prefix}'",
            status_code=404
        )

    try:
        base_url = discover_service(service_name)

    except RuntimeError as e:
        return Response(
            content=str(e),
            status_code=503
        )

    target_url = f"{base_url}/{full_path}"

    body = await request.body()

    async with httpx.AsyncClient() as client:

        resp = await client.request(
            method=request.method,
            url=target_url,
            headers={
                k: v
                for k, v in request.headers.items()
                if k.lower() != "host"
            },
            params=request.query_params,
            content=body,
            timeout=30.0,
        )

    excluded_headers = {
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection"
    }

    response_headers = {
        k: v
        for k, v in resp.headers.items()
        if k.lower() not in excluded_headers
    }

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=response_headers
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080
    )