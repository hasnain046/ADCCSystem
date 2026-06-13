"""
ADCC — LangGraph Workflow Nodes
================================
Defines the LangGraph-compatible wrapper nodes that invoke the underlying
ADCC agents. These wrapper nodes maintain zero business logic duplication,
delegating all execution to the corresponding agent modules.

Nodes:
    1. collect_data_node
    2. verification_node
    3. severity_node
    4. allocation_node
    5. shelter_node
    6. replanning_node
"""

from loguru import logger
from workflows.state import DisasterState

# Import agent entry points
from agents.data_collection_agent import collect_all_data
from agents.verification_agent import run_verification
from agents.severity_agent import run_severity_assessment
from agents.allocation_agent import run_resource_allocation
from agents.shelter_agent import run_shelter_assignment
from agents.replanning_agent import run_dynamic_replanning


def collect_data_node(state: DisasterState) -> DisasterState:
    """
    LangGraph wrapper node for the Data Collection Agent.
    Fetches weather, GDACS alerts, USGS earthquake events, and local resources.
    
    Coordinates are extracted from the input state (e.g. from state['latitude'],
    state['longitude'], or weather_data if pre-initialized) with safe default values
    for Mumbai, India.
    """
    logger.info("[WorkflowNode] ---> Entering Data Collection Node")
    
    # Extract coordinate inputs from state or fallback to Mumbai default
    latitude = state.get("latitude") or 19.0760
    longitude = state.get("longitude") or 72.8777
    location_label = state.get("location_label") or "Mumbai"
    country = state.get("country") or "India"
    
    # Check if weather_data has latitude/longitude (in case it was set prior)
    weather = state.get("weather_data")
    if weather:
        latitude = weather.get("latitude") or latitude
        longitude = weather.get("longitude") or longitude
        
    return collect_all_data(
        state,
        latitude=latitude,
        longitude=longitude,
        location_label=location_label,
        country=country,
    )


def verification_node(state: DisasterState) -> DisasterState:
    """
    LangGraph wrapper node for the Verification Agent.
    Cross-checks collected alerts against news sources and confidence score logic.
    """
    logger.info("[WorkflowNode] ---> Entering Verification Node")
    return run_verification(state)


def severity_node(state: DisasterState) -> DisasterState:
    """
    LangGraph wrapper node for the Severity Assessment Agent.
    Computes population impact, weather risk, magnitude, and resource stress levels.
    """
    logger.info("[WorkflowNode] ---> Entering Severity Node")
    return run_severity_assessment(state)


def allocation_node(state: DisasterState) -> DisasterState:
    """
    LangGraph wrapper node for the Resource Allocation Agent.
    Allocates available safety resources based on calculated severity and requirements.
    """
    logger.info("[WorkflowNode] ---> Entering Resource Allocation Node")
    return run_resource_allocation(state)


def shelter_node(state: DisasterState) -> DisasterState:
    """
    LangGraph wrapper node for the Shelter Assignment Agent.
    Sequentially maps affected population to nearest shelters, managing overflow risk.
    """
    logger.info("[WorkflowNode] ---> Entering Shelter Assignment Node")
    return run_shelter_assignment(state)


def replanning_node(state: DisasterState) -> DisasterState:
    """
    LangGraph wrapper node for the Dynamic Replanning Agent.
    Evaluates trigger conditions (rainfall, deficit, aftershock) and modifies plans.
    """
    logger.info("[WorkflowNode] ---> Entering Dynamic Replanning Node")
    return run_dynamic_replanning(state)
