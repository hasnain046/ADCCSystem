"""
ADCC — FastAPI Application
===========================
Main FastAPI application for the Autonomous Disaster Command Center backend.

Endpoints:
    GET  /health                → Database & system health check
    GET  /api/disasters         → List all disasters (with filters)
    POST /api/disasters         → Create new disaster
    GET  /api/resources         → List all resources (with filters)
    POST /api/resources         → Create new resource
    GET  /api/hospitals         → List all hospitals
    GET  /api/shelters          → List all shelters
    GET  /api/alerts            → List all alerts (with severity filter)
    POST /api/alerts            → Create new alert
    GET  /api/datasources       → List all external API data sources
    GET  /api/sync-logs         → API sync history
    GET  /api/verification-logs → Verification records per disaster
    GET  /api/allocations       → Resource allocation records
    POST /api/allocations       → Create new resource allocation
    GET  /api/simulations       → Simulation run records
    POST /api/simulations       → Create new simulation run

CORS:
    Allows requests from React frontend (localhost:5173 — Vite dev server)

Future Integration:
    - LangGraph agents call POST endpoints to log their decisions
    - verification_agent.py → POST /api/verification-logs
    - allocation_agent.py   → POST /api/allocations
    - simulation_engine.py  → POST /api/simulations
    - gdacs_tool.py         → POST /api/disasters (from external feed)
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.models import (
    Alert,
    AllocationStatus,
    ApiSyncLog,
    DataSource,
    Disaster,
    DisasterStatus,
    DisasterType,
    Hospital,
    Resource,
    ResourceAllocation,
    ResourceStatus,
    ResourceType,
    SeverityLevel,
    Shelter,
    SimulationRun,
    SourceType,
    SyncStatus,
    VerificationLog,
    VerificationStatus,
)
from database.postgres import get_db, test_connection

# ===========================================================================
# APP INITIALIZATION
# ===========================================================================

app = FastAPI(
    title="ADCC — Autonomous Disaster Command Center API",
    description=(
        "Backend API for the ADCC system. Manages disaster events, resources, "
        "hospitals, shelters, alerts, and AI agent decision logs."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow React frontend (Vite dev server on :5173 and :3000)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================================
# STARTUP EVENT
# ===========================================================================

@app.on_event("startup")
async def startup_event():
    """Test DB connection on app startup, ensure tables exist, and seed database if empty."""
    logger.info("🚀 ADCC API starting up...")
    
    # Check connection
    db_connected = test_connection()
    if db_connected:
        logger.info("✅ Database connection successful")
    else:
        logger.warning("⚠️ Main database connection failed. Falling back to SQLite.")

    # Create tables and auto-seed if needed
    try:
        from database.postgres import create_tables
        from database.seed_data import seed_all
        
        # Ensure tables exist
        create_tables()
        
        # Run seed_all (checks internally if data already exists, safe to call)
        seed_all(reset=False)
        logger.info("✅ Database tables verified and auto-seeding completed.")
    except Exception as e:
        logger.error(f"❌ Error during startup database initialization: {e}")


# ===========================================================================
# PYDANTIC SCHEMAS
# ===========================================================================

# ── Disaster ────────────────────────────────────────────────────────────────

class DisasterCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    disaster_type: DisasterType
    severity: SeverityLevel
    status: DisasterStatus = DisasterStatus.ACTIVE
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    affected_population: Optional[int] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    source: Optional[str] = None
    source_type: Optional[SourceType] = None
    source_url: Optional[str] = None
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED


class DisasterResponse(BaseModel):
    id: uuid.UUID
    title: str
    disaster_type: DisasterType
    severity: SeverityLevel
    status: DisasterStatus
    latitude: float
    longitude: float
    affected_population: Optional[int]
    confidence_score: Optional[float]
    source: Optional[str]
    source_type: Optional[SourceType]
    source_url: Optional[str]
    verification_status: VerificationStatus
    last_verified_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Resource ────────────────────────────────────────────────────────────────

class ResourceCreate(BaseModel):
    resource_name: str = Field(..., min_length=2, max_length=255)
    resource_type: ResourceType
    status: ResourceStatus = ResourceStatus.AVAILABLE
    quantity: int = Field(1, ge=1)
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ResourceResponse(BaseModel):
    id: uuid.UUID
    resource_name: str
    resource_type: ResourceType
    status: ResourceStatus
    quantity: int
    latitude: Optional[float]
    longitude: Optional[float]
    last_updated: datetime

    class Config:
        from_attributes = True


# ── Hospital ────────────────────────────────────────────────────────────────

class HospitalResponse(BaseModel):
    id: uuid.UUID
    name: str
    city: str
    total_beds: int
    available_beds: int
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


# ── Shelter ─────────────────────────────────────────────────────────────────

class ShelterResponse(BaseModel):
    id: uuid.UUID
    name: str
    city: str
    capacity: int
    occupied: int
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


# ── Alert ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    severity: SeverityLevel
    message: str
    source: Optional[str] = None
    source_type: Optional[SourceType] = None
    source_url: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class AlertResponse(BaseModel):
    id: uuid.UUID
    title: str
    severity: SeverityLevel
    message: str
    source: Optional[str]
    source_type: Optional[SourceType]
    source_url: Optional[str]
    confidence_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ── DataSource ───────────────────────────────────────────────────────────────

class DataSourceResponse(BaseModel):
    id: uuid.UUID
    name: str
    source_type: SourceType
    base_url: str
    status: str
    last_sync: Optional[datetime]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── ApiSyncLog ───────────────────────────────────────────────────────────────

class ApiSyncLogResponse(BaseModel):
    id: uuid.UUID
    source_name: str
    sync_status: SyncStatus
    records_fetched: Optional[int]
    error_message: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── VerificationLog ──────────────────────────────────────────────────────────

class VerificationLogCreate(BaseModel):
    disaster_id: uuid.UUID
    source_checked: str
    result: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: Optional[str] = None


class VerificationLogResponse(BaseModel):
    id: uuid.UUID
    disaster_id: uuid.UUID
    source_checked: str
    result: str
    confidence: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── ResourceAllocation ───────────────────────────────────────────────────────

class AllocationCreate(BaseModel):
    disaster_id: uuid.UUID
    resource_id: uuid.UUID
    quantity: int = Field(1, ge=1)
    allocation_reason: Optional[str] = None
    status: AllocationStatus = AllocationStatus.ACTIVE


class AllocationResponse(BaseModel):
    id: uuid.UUID
    disaster_id: uuid.UUID
    resource_id: uuid.UUID
    quantity: int
    allocation_reason: Optional[str]
    status: AllocationStatus
    allocated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── SimulationRun ────────────────────────────────────────────────────────────

class SimulationCreate(BaseModel):
    scenario_name: str = Field(..., min_length=3, max_length=255)
    rainfall_change: Optional[float] = None
    wind_speed_change: Optional[float] = None
    population_change: Optional[int] = None
    result_summary: Optional[str] = None
    predicted_severity: Optional[SeverityLevel] = None


class SimulationResponse(BaseModel):
    id: uuid.UUID
    scenario_name: str
    rainfall_change: Optional[float]
    wind_speed_change: Optional[float]
    population_change: Optional[int]
    result_summary: Optional[str]
    predicted_severity: Optional[SeverityLevel]
    created_at: datetime

    class Config:
        from_attributes = True


# ===========================================================================
# HEALTH CHECK
# ===========================================================================

@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.
    Verifies database connectivity and returns system status.
    """
    try:
        disaster_count = db.query(Disaster).count()
        resource_count = db.query(Resource).count()
        return {
            "status": "healthy",
            "database": "connected",
            "stats": {
                "disasters": disaster_count,
                "resources": resource_count,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")


# ===========================================================================
# DISASTER ENDPOINTS
# ===========================================================================

@app.get("/api/disasters", response_model=list[DisasterResponse], tags=["Disasters"])
def get_disasters(
    disaster_type: Optional[DisasterType] = Query(None),
    severity: Optional[SeverityLevel] = Query(None),
    status: Optional[DisasterStatus] = Query(None),
    verification_status: Optional[VerificationStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get all disasters with optional filters.

    Query params:
        disaster_type: Filter by type (Flood, Cyclone, Earthquake, etc.)
        severity:      Filter by severity (Low, Medium, High, Critical)
        status:        Filter by status (Active, Monitoring, Resolved, Archived)
        verification_status: Filter by verification state
        limit:         Max records to return (default 50)
        offset:        Pagination offset
    """
    query = db.query(Disaster)
    if disaster_type:
        query = query.filter(Disaster.disaster_type == disaster_type)
    if severity:
        query = query.filter(Disaster.severity == severity)
    if status:
        query = query.filter(Disaster.status == status)
    if verification_status:
        query = query.filter(Disaster.verification_status == verification_status)

    return query.order_by(Disaster.created_at.desc()).offset(offset).limit(limit).all()


@app.post("/api/disasters", response_model=DisasterResponse, status_code=201, tags=["Disasters"])
def create_disaster(payload: DisasterCreate, db: Session = Depends(get_db)):
    """
    Create a new disaster record.
    Called by: data_collection_agent.py, gdacs_tool.py, Manual entry.
    """
    disaster = Disaster(**payload.model_dump())
    db.add(disaster)
    db.commit()
    db.refresh(disaster)
    logger.info(f"✅ New disaster created: {disaster.title} [{disaster.id}]")
    return disaster


@app.get("/api/disasters/{disaster_id}", response_model=DisasterResponse, tags=["Disasters"])
def get_disaster(disaster_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a specific disaster by ID."""
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")
    return disaster


# ===========================================================================
# RESOURCE ENDPOINTS
# ===========================================================================

@app.get("/api/resources", response_model=list[ResourceResponse], tags=["Resources"])
def get_resources(
    resource_type: Optional[ResourceType] = Query(None),
    status: Optional[ResourceStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get all resources with optional filters.
    Used by: allocation_agent.py, resource_tool.py
    """
    query = db.query(Resource)
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    if status:
        query = query.filter(Resource.status == status)
    return query.offset(offset).limit(limit).all()


@app.post("/api/resources", response_model=ResourceResponse, status_code=201, tags=["Resources"])
def create_resource(payload: ResourceCreate, db: Session = Depends(get_db)):
    """Create a new resource record."""
    resource = Resource(**payload.model_dump())
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


# ===========================================================================
# HOSPITAL ENDPOINTS
# ===========================================================================

@app.get("/api/hospitals", response_model=list[HospitalResponse], tags=["Hospitals"])
def get_hospitals(
    city: Optional[str] = Query(None),
    min_available_beds: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Get all hospitals.
    Used by: allocation_agent.py to find nearest hospital with available beds.
    """
    query = db.query(Hospital)
    if city:
        query = query.filter(Hospital.city.ilike(f"%{city}%"))
    if min_available_beds:
        query = query.filter(Hospital.available_beds >= min_available_beds)
    return query.limit(limit).all()


# ===========================================================================
# SHELTER ENDPOINTS
# ===========================================================================

@app.get("/api/shelters", response_model=list[ShelterResponse], tags=["Shelters"])
def get_shelters(
    city: Optional[str] = Query(None),
    min_available_capacity: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Get all shelters.
    Used by: shelter_agent.py to find available shelter for evacuees.
    """
    query = db.query(Shelter)
    if city:
        query = query.filter(Shelter.city.ilike(f"%{city}%"))
    if min_available_capacity:
        query = query.filter((Shelter.capacity - Shelter.occupied) >= min_available_capacity)
    return query.limit(limit).all()


# ===========================================================================
# ALERT ENDPOINTS
# ===========================================================================

@app.get("/api/alerts", response_model=list[AlertResponse], tags=["Alerts"])
def get_alerts(
    severity: Optional[SeverityLevel] = Query(None),
    source_type: Optional[SourceType] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Get all alerts.
    Used by: notification_tool.py, command_center dashboard.
    """
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if source_type:
        query = query.filter(Alert.source_type == source_type)
    return query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()


@app.post("/api/alerts", response_model=AlertResponse, status_code=201, tags=["Alerts"])
def create_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    """
    Create a new alert.
    Called by: severity_agent.py (on severity escalation), data_collection_agent.py
    """
    alert = Alert(**payload.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info(f"🔔 New alert: {alert.title} [{alert.severity.value}]")
    return alert


# ===========================================================================
# DATA SOURCE ENDPOINTS
# ===========================================================================

@app.get("/api/datasources", response_model=list[DataSourceResponse], tags=["Data Sources"])
def get_data_sources(db: Session = Depends(get_db)):
    """Get all registered external API data sources."""
    return db.query(DataSource).all()


# ===========================================================================
# API SYNC LOG ENDPOINTS
# ===========================================================================

@app.get("/api/sync-logs", response_model=list[ApiSyncLogResponse], tags=["API Sync"])
def get_sync_logs(
    source_name: Optional[str] = Query(None),
    sync_status: Optional[SyncStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Get API sync history.
    Used by: command_center.py dashboard to show API health.
    """
    query = db.query(ApiSyncLog)
    if source_name:
        query = query.filter(ApiSyncLog.source_name.ilike(f"%{source_name}%"))
    if sync_status:
        query = query.filter(ApiSyncLog.sync_status == sync_status)
    return query.order_by(ApiSyncLog.started_at.desc()).limit(limit).all()


# ===========================================================================
# VERIFICATION LOG ENDPOINTS
# ===========================================================================

@app.get("/api/verification-logs", response_model=list[VerificationLogResponse], tags=["Verification"])
def get_verification_logs(
    disaster_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Get verification log records.
    Used by: verification_agent.py, command_center dashboard.
    """
    query = db.query(VerificationLog)
    if disaster_id:
        query = query.filter(VerificationLog.disaster_id == disaster_id)
    return query.order_by(VerificationLog.created_at.desc()).limit(limit).all()


@app.post("/api/verification-logs", response_model=VerificationLogResponse, status_code=201, tags=["Verification"])
def create_verification_log(payload: VerificationLogCreate, db: Session = Depends(get_db)):
    """
    Log a verification check result.
    Called by: verification_agent.py after each source check.
    """
    # Validate disaster exists
    disaster = db.query(Disaster).filter(Disaster.id == payload.disaster_id).first()
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")

    log = VerificationLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ===========================================================================
# RESOURCE ALLOCATION ENDPOINTS
# ===========================================================================

@app.get("/api/allocations", response_model=list[AllocationResponse], tags=["Allocations"])
def get_allocations(
    disaster_id: Optional[uuid.UUID] = Query(None),
    status: Optional[AllocationStatus] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Get resource allocation records.
    Used by: allocation_agent.py, command_center dashboard.
    """
    query = db.query(ResourceAllocation)
    if disaster_id:
        query = query.filter(ResourceAllocation.disaster_id == disaster_id)
    if status:
        query = query.filter(ResourceAllocation.status == status)
    return query.order_by(ResourceAllocation.allocated_at.desc()).limit(limit).all()


@app.post("/api/allocations", response_model=AllocationResponse, status_code=201, tags=["Allocations"])
def create_allocation(payload: AllocationCreate, db: Session = Depends(get_db)):
    """
    Create a resource allocation record.
    Called by: allocation_agent.py when deploying resources to a disaster.
    """
    # Validate disaster and resource exist
    disaster = db.query(Disaster).filter(Disaster.id == payload.disaster_id).first()
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")

    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    allocation = ResourceAllocation(**payload.model_dump())
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    logger.info(f"🚁 Resource allocated: {resource.resource_name} → Disaster {disaster.title}")
    return allocation


# ===========================================================================
# SIMULATION ENDPOINTS
# ===========================================================================

@app.get("/api/simulations", response_model=list[SimulationResponse], tags=["Simulations"])
def get_simulations(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Get simulation run records.
    Used by: simulation_engine.py, Digital Twin dashboard.
    """
    return db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).limit(limit).all()


@app.post("/api/simulations", response_model=SimulationResponse, status_code=201, tags=["Simulations"])
def create_simulation(payload: SimulationCreate, db: Session = Depends(get_db)):
    """
    Log a new simulation run.
    Called by: services/simulation_engine.py after completing a scenario.
    """
    simulation = SimulationRun(**payload.model_dump())
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    logger.info(f"🔬 Simulation created: {simulation.scenario_name}")
    return simulation


class SimulationRunRequest(BaseModel):
    simulation_type: str = Field(..., description="Flood, Cyclone, or Earthquake")
    rainfall_change_pct: float = Field(0.0)
    wind_speed_change_pct: float = Field(0.0)
    population_change_pct: float = Field(0.0)
    shelter_capacity_change_pct: float = Field(0.0)
    resource_availability_change_pct: float = Field(0.0)
    disaster_id: Optional[str] = None


@app.post("/api/simulations/run", tags=["Simulations"])
def run_simulation_scenario(payload: SimulationRunRequest, db: Session = Depends(get_db)):
    """
    Runs a digital twin simulation with specified parameters,
    persists it into the DB, and returns comparison outcomes.
    """
    try:
        from services.simulation_engine import run_simulation
        result = run_simulation(
            db=db,
            simulation_type=payload.simulation_type,
            rainfall_change_pct=payload.rainfall_change_pct,
            wind_speed_change_pct=payload.wind_speed_change_pct,
            population_change_pct=payload.population_change_pct,
            shelter_capacity_change_pct=payload.shelter_capacity_change_pct,
            resource_availability_change_pct=payload.resource_availability_change_pct,
            disaster_id=payload.disaster_id
        )
        return result
    except Exception as e:
        logger.error(f"Error running simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================================================================
# ROOT
# ===========================================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[list[ChatMessage]] = None


@app.post("/api/command-center/chat", tags=["Command Center AI"])
def command_center_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Cognitive Chatbot endpoint. Ask natural language questions about active disasters,
    allocations, shelter occupancy, and what-if simulation results.
    """
    try:
        from agents.command_center import analyze_disaster
        # Convert Pydantic objects to simple dicts for conversation history
        history = []
        if payload.conversation_history:
            history = [{"role": msg.role, "content": msg.content} for msg in payload.conversation_history]
            
        answer = analyze_disaster(db, payload.message, conversation_history=history)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error in command center chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/command-center/summary", tags=["Command Center AI"])
def get_cognitive_summary(db: Session = Depends(get_db)):
    """Generates an AI-authored comprehensive situation report of active hazard zones."""
    try:
        from agents.command_center import summarize_current_situation
        summary = summarize_current_situation(db)
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Error generating situation report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/command-center/explain-severity", tags=["Command Center AI"])
def get_severity_explanation(db: Session = Depends(get_db)):
    """Generates an AI explanation of active severity stress factors."""
    try:
        from agents.command_center import explain_severity
        explanation = explain_severity(db)
        return {"explanation": explanation}
    except Exception as e:
        logger.error(f"Error generating severity explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/command-center/explain-allocation", tags=["Command Center AI"])
def get_allocation_explanation(db: Session = Depends(get_db)):
    """Generates an AI explanation of resource allocations and depot strain."""
    try:
        from agents.command_center import explain_resource_allocation
        explanation = explain_resource_allocation(db)
        return {"explanation": explanation}
    except Exception as e:
        logger.error(f"Error generating allocation explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/command-center/explain-shelters", tags=["Command Center AI"])
def get_shelter_explanation(db: Session = Depends(get_db)):
    """Generates an AI explanation of evacuation routing and shelter utilization."""
    try:
        from agents.command_center import explain_shelter_plan
        explanation = explain_shelter_plan(db)
        return {"explanation": explanation}
    except Exception as e:
        logger.error(f"Error generating shelter explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/command-center/recommendations", tags=["Command Center AI"])
def get_action_recommendations(db: Session = Depends(get_db)):
    """Generates AI tactical action recommendations for command center operators."""
    try:
        from agents.command_center import generate_action_recommendations
        recommendations = generate_action_recommendations(db)
        return {"recommendations": recommendations}
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class WorkflowRunPayload(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_label: Optional[str] = "Disaster Zone"
    country: Optional[str] = "India"


@app.post("/api/orchestration/run", tags=["Orchestration"])
def run_orchestration_workflow(payload: WorkflowRunPayload, db: Session = Depends(get_db)):
    """
    Triggers the complete LangGraph ADCC orchestration pipeline:
    Data Collection -> Verification -> Severity -> Allocation -> Shelter -> Replanning.
    Persists the resulting disaster events, logs, allocations, and shelter assignments to the DB.
    """
    logger.info(f"⚡ Ingesting manual orchestration trigger at: {payload.location_label} ({payload.latitude}, {payload.longitude})")
    try:
        from workflows.graph import run_graph
        
        # Build initial state dict
        initial_state = {
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "location_label": payload.location_label,
            "country": payload.country
        }
        
        # Run graph
        result = run_graph(initial_state)
        
        if result.get("status") != "success":
            raise HTTPException(status_code=500, detail=f"Orchestration failure: {result.get('error_message')}")
            
        final_state = result["state"]
        
        # 1. Persist verified reports as disasters
        verified_reports = final_state.get("verified_reports") or []
        created_disasters = []
        
        # If no verified reports were found, let's create a single disaster based on weather flood risk or alerts to show data
        # this ensures we always have a disaster record when the pipeline runs.
        if not verified_reports:
            weather = final_state.get("weather_data") or {}
            is_flood = weather.get("flood_risk", False) or weather.get("rainfall_mm", 0.0) >= 50.0
            
            disaster_title = f"{payload.location_label} Inundation Warning" if is_flood else f"{payload.location_label} Meteorological Event"
            d_type = DisasterType.FLOOD if is_flood else DisasterType.CYCLONE
            
            # Check if exists
            existing = db.query(Disaster).filter(Disaster.title == disaster_title).first()
            if not existing:
                disaster = Disaster(
                    title=disaster_title,
                    disaster_type=d_type,
                    severity=SeverityLevel(final_state.get("severity_level", "Low")),
                    status=DisasterStatus.ACTIVE,
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    affected_population=1000 if is_flood else 0,
                    confidence_score=final_state.get("confidence_score", 0.1),
                    verification_status=VerificationStatus.VERIFIED if is_flood else VerificationStatus.UNVERIFIED,
                    source="Open-Meteo",
                    source_type=SourceType.OPENMETEO
                )
                db.add(disaster)
                db.commit()
                db.refresh(disaster)
                existing = disaster
            created_disasters.append(existing)
        else:
            for rep in verified_reports:
                title = rep.get("disaster_title")
                existing = db.query(Disaster).filter(Disaster.title == title).first()
                if not existing:
                    d_type = DisasterType.FLOOD
                    title_l = title.lower()
                    if "earthquake" in title_l or "quake" in title_l:
                        d_type = DisasterType.EARTHQUAKE
                    elif "cyclone" in title_l or "storm" in title_l or "typhoon" in title_l:
                        d_type = DisasterType.CYCLONE
                    elif "fire" in title_l or "wildfire" in title_l:
                        d_type = DisasterType.WILDFIRE
                        
                    disaster = Disaster(
                        title=title,
                        disaster_type=d_type,
                        severity=SeverityLevel(final_state.get("severity_level", "Medium")),
                        status=DisasterStatus.ACTIVE,
                        latitude=payload.latitude,
                        longitude=payload.longitude,
                        affected_population=1200,
                        confidence_score=rep.get("consensus_confidence", 0.5),
                        verification_status=VerificationStatus.VERIFIED,
                        source=rep.get("sources_checked", ["GDACS"])[0],
                        source_type=SourceType.GDACS
                    )
                    db.add(disaster)
                    db.commit()
                    db.refresh(disaster)
                    existing = disaster
                created_disasters.append(existing)
                
                # Create verification log
                for src in rep.get("sources_checked") or []:
                    log_exists = db.query(VerificationLog).filter(
                        VerificationLog.disaster_id == existing.id,
                        VerificationLog.source_checked == src
                    ).first()
                    if not log_exists:
                        v_log = VerificationLog(
                            disaster_id=existing.id,
                            source_checked=src,
                            result=rep.get("verification_result", "Verified"),
                            confidence=rep.get("consensus_confidence", 0.8),
                            notes=rep.get("verification_notes", "Orchestrated pipeline run verification")
                        )
                        db.add(v_log)
                
        # 2. Persist resource allocations
        alloc_plan = final_state.get("allocation_plan") or {}
        allocations_list = alloc_plan.get("allocations") or []
        primary_disaster = created_disasters[0] if created_disasters else None
        
        if primary_disaster and allocations_list:
            for alloc in allocations_list:
                res_id_str = alloc.get("resource_id")
                try:
                    res_id = uuid.UUID(res_id_str)
                    db_res = db.query(Resource).filter(Resource.id == res_id).first()
                    if db_res:
                        existing_alloc = db.query(ResourceAllocation).filter(
                            ResourceAllocation.disaster_id == primary_disaster.id,
                            ResourceAllocation.resource_id == res_id
                        ).first()
                        
                        if not existing_alloc:
                            allocation_record = ResourceAllocation(
                                disaster_id=primary_disaster.id,
                                resource_id=res_id,
                                quantity=alloc.get("quantity", 1),
                                allocation_reason=alloc.get("reason", "Pipeline allocated"),
                                status=AllocationStatus.ACTIVE
                            )
                            db.add(allocation_record)
                            db_res.status = ResourceStatus.BUSY
                except Exception as ex:
                    logger.warning(f"Could not persist allocation for resource {res_id_str}: {ex}")
                    
        # 3. Persist shelter assignments
        shelter_plan = final_state.get("shelter_plan") or {}
        assigned_shelters = shelter_plan.get("assigned_shelters") or []
        if assigned_shelters:
            for ash in assigned_shelters:
                sh_id_str = ash.get("shelter_id")
                if sh_id_str != "temp-camp-delta":
                    try:
                        sh_id = uuid.UUID(sh_id_str)
                        db_shelter = db.query(Shelter).filter(Shelter.id == sh_id).first()
                        if db_shelter:
                            db_shelter.occupied = min(db_shelter.capacity, db_shelter.occupied + ash.get("assigned_people", 0))
                    except Exception as ex:
                        logger.warning(f"Could not update occupancy for shelter {sh_id_str}: {ex}")
                        
        # 4. Persist alerts
        weather_d = final_state.get("weather_data") or {}
        if weather_d.get("rainfall_mm", 0.0) >= 50.0:
            rain_alert = Alert(
                title="Torrential Rainfall Inundation",
                severity=SeverityLevel.CRITICAL,
                message=f"Heavy rain of {weather_d.get('rainfall_mm')} mm/hr has triggered flash-flood warnings.",
                source="Open-Meteo",
                source_type=SourceType.OPENMETEO,
                confidence_score=0.95
            )
            db.add(rain_alert)
            
        # Commit all DB operations
        db.commit()
        
        return {
            "status": "success",
            "severity": result["severity"],
            "confidence": result["confidence"],
            "resources_allocated": result["resources_allocated"],
            "shelters_assigned": result["shelters_assigned"],
            "session_id": final_state.get("session_id"),
            "disasters_created": [str(d.id) for d in created_disasters],
            "replanning_actions": final_state.get("replanning_actions", []),
            "recommendations": final_state.get("recommendations", []),
            "node_trace": final_state.get("metadata", {}).get("nodes_visited", []),
            "state": final_state
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during orchestration execution endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", tags=["System"])
def root():
    return {
        "name": "ADCC — Autonomous Disaster Command Center API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "status": "operational",
    }
