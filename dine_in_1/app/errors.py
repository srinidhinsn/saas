from fastapi import HTTPException


def forbidden_error(detail="Restricted Access or Restricted Grant"):
    return HTTPException(status_code=403, detail=detail)


def internal_server_error(detail="Server internal error. Please contact administrator."):
    return HTTPException(status_code=500, detail=detail)


def service_unavailable(detail="Service is temporarily unavailable."):
    return HTTPException(status_code=503, detail=detail)


def generic_error(detail="We are facing technical issues. Please contact administrator."):
    # 520 = Web server returned an unknown error
    return HTTPException(status_code=520, detail=detail)
