from .auth import auth_bp
from .community import community_bp
from .experiments import experiments_bp
from .reports import reports_bp
from .files import files_bp
from .gallery import gallery_bp
from .records import records_bp

__all__ = [
    "auth_bp",
    "community_bp",
    "experiments_bp",
    "reports_bp",
    "files_bp",
    "gallery_bp",
    "records_bp",
]
