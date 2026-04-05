from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.auth.router import router as auth_router
from app.house.router import router as house_router
from app.expenses.router import router as expenses_router
from app.dashboard.router import router as dashboard_router
from app.reports.router import router as reports_router
from app.rent.router import router as rent_router
from app.push.router import router as push_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Bachelor House Finance",
        description="Track shared expenses and rent for bachelor housemates",
        version="1.0.0",
    )

    from app.config import settings
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app",  # any vercel preview URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Create tables
    Base.metadata.create_all(bind=engine)

    # Background scheduler for month-end emails
    @app.on_event("startup")
    async def start_scheduler():
        import asyncio
        from app.reports.scheduler import scheduler_loop
        asyncio.create_task(scheduler_loop())

    # Register routers
    app.include_router(auth_router)
    app.include_router(house_router)
    app.include_router(expenses_router)
    app.include_router(dashboard_router)
    app.include_router(reports_router)
    app.include_router(rent_router)
    app.include_router(push_router)

    @app.get("/api/health")
    def health_check():
        return {"status": "ok", "app": "Bachelor House Finance"}

    @app.get("/api/categories")
    def get_categories():
        from app.models import EXPENSE_CATEGORIES
        return {"categories": EXPENSE_CATEGORIES}

    return app


app = create_app()
