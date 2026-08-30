"""Helpers for keeping blocking work off the event loop.

Every route in this project is declared ``async def``, which means it runs
directly on the single event loop thread. Any synchronous call that waits on
I/O or burns CPU inside such a handler stalls *every* concurrent request, not
just its own -- with 30-second heartbeats arriving from every registered
device, that is the difference between a responsive API and a stalled one.

Three things in this codebase block and must always be wrapped:

* **SQLAlchemy sync sessions** -- every query in ``src.services``.
* **bcrypt hashing** -- deliberately slow by design (BCRYPT_ROUNDS), and pure
  CPU, so it blocks for tens of milliseconds per login.
* **The Firebase and APNs SDKs** -- synchronous HTTP clients that wait on the
  network for up to PUSH_TIMEOUT_SECONDS.

Use ``run_blocking`` for these. Never call them bare from an ``async def``.
"""

from collections.abc import Callable
from typing import ParamSpec, TypeVar

from anyio import to_thread

P = ParamSpec("P")
T = TypeVar("T")


async def run_blocking(func: Callable[P, T], *args: P.args, **kwargs: P.kwargs) -> T:
    """Run a blocking callable in a worker thread and await its result.

    Args:
        func: Synchronous callable to run off the event loop.
        *args: Positional arguments for ``func``.
        **kwargs: Keyword arguments for ``func``.

    Returns:
        Whatever ``func`` returns.

    Example:
        Instead of calling a blocking service method directly::

            device = service.get_device(device_id)        # blocks the loop

        offload it::

            device = await run_blocking(service.get_device, device_id)
    """
    raise NotImplementedError


async def gather_with_limit(
    tasks: list[Callable[[], T]],
    max_concurrent: int,
) -> list[T]:
    """Run tasks concurrently with a ceiling on how many run at once.

    Used when fanning out push notifications: alerting every device on a busy
    network at once would open one connection per device to the push provider.
    The limit keeps that bounded while still sending in parallel.

    Args:
        tasks: Zero-argument callables to run.
        max_concurrent: Maximum number in flight at any moment.

    Returns:
        Results in the same order as ``tasks``.
    """
    raise NotImplementedError
