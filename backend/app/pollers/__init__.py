from ..config import Settings


def make_poller(settings: Settings):
    if settings.tatzpit_mode == "demo":
        from .demo import DemoPoller
        return DemoPoller(settings)
    if settings.tatzpit_mode == "indexer":
        from .indexer import IndexerPoller
        return IndexerPoller(settings)
    if settings.tatzpit_mode == "ssh":
        from .ssh_tail import SshTailPoller
        return SshTailPoller(settings)
    raise ValueError(f"Unknown mode: {settings.tatzpit_mode}")
