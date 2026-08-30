"""Shared contracts used across every endpoint."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

from src.utils.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_NUMBER

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters accepted by every list endpoint.

    Prefix sort with '-' for descending, e.g. sort=-created_at.
    """

    page: int = Field(default=MIN_PAGE_NUMBER, ge=MIN_PAGE_NUMBER)
    limit: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
    sort: str | None = None


class PaginationMeta(BaseModel):
    """The pagination block returned under data.pagination."""

    current_page: int
    total_pages: int
    total_count: int
    page_size: int
    has_next: bool
    has_prev: bool


class ErrorDetail(BaseModel):
    """One entry in the errors array."""

    code: str
    message: str
    field: str | None = None


class ResponseEnvelope(BaseModel, Generic[T]):
    """The single response shape every endpoint returns.

    Documented here so FastAPI renders it in the OpenAPI schema. Responses are
    built at runtime by src.utils.responses, not by instantiating this class.
    """

    success: bool
    status_code: int
    data: dict[str, Any] | None
    errors: list[ErrorDetail] = Field(default_factory=list)
    correlation_id: str
    timestamp: str
    message: str | None = None
