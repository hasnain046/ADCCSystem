"""
ADCC — LangGraph Orchestration Layer
=====================================
Defines the StateGraph structure for the Autonomous Disaster Command Center (ADCC).
Compiles the workflow execution trace from data collection to dynamic replanning.

Workflow Pipeline:
    START 
      ↓
    collect_data_node
      ↓
    verification_node
      ↓
    severity_node
      ↓
    allocation_node
      ↓
    shelter_node
      ↓
    replanning_node
      ↓
    END
"""

from loguru import logger
from langgraph.graph import StateGraph, START, END

from workflows.state import DisasterState, create_initial_state
from workflows.nodes import (
    collect_data_node,
    verification_node,
    severity_node,
    allocation_node,
    shelter_node,
    replanning_node,
)


def build_graph():
    """
    Constructs and compiles the ADCC LangGraph StateGraph workflow.
    
    Returns:
        CompiledStateGraph: The compiled workflow ready for invocation.
    """
    logger.info("[ADCCGraph] Building StateGraph workflow structure...")
    
    # Initialize StateGraph using the TypedDict schema
    builder = StateGraph(DisasterState)
    
    # 1. Register nodes
    builder.add_node("collect_data", collect_data_node)
    builder.add_node("verification", verification_node)
    builder.add_node("severity", severity_node)
    builder.add_node("allocation", allocation_node)
    builder.add_node("shelter", shelter_node)
    builder.add_node("replanning", replanning_node)
    
    # 2. Register edges (linear workflow progression)
    builder.add_edge(START, "collect_data")
    builder.add_edge("collect_data", "verification")
    builder.add_edge("verification", "severity")
    builder.add_edge("severity", "allocation")
    builder.add_edge("allocation", "shelter")
    builder.add_edge("shelter", "replanning")
    builder.add_edge("replanning", END)
    
    # 3. Compile
    graph = builder.compile()
    logger.success("[ADCCGraph] LangGraph workflow compiled successfully.")
    return graph


def run_graph(initial_state: dict) -> dict:
    """
    Executes the ADCC StateGraph with the provided initial state.
    Pre-populates the shared state with safe defaults, then merges input keys.
    
    Args:
        initial_state: dict containing initial parameters (e.g. latitude, longitude).
        
    Returns:
        dict: Normalized response object describing execution results.
    """
    logger.info("[ADCCGraph] Executing workflow execution helper...")
    try:
        # Initialize full state structure with default values
        state = create_initial_state(
            session_id=initial_state.get("session_id"),
            environment=initial_state.get("environment", "development")
        )
        
        # Merge input fields (like coordinates, label, override configurations)
        state.update(initial_state)
        
        # Compile and invoke graph
        graph = build_graph()
        final_state = graph.invoke(state)
        
        # Extract plans to check status flags
        alloc_plan = final_state.get("allocation_plan")
        resources_allocated = alloc_plan is not None and len(alloc_plan.get("allocations") or []) > 0
        
        shelter_plan = final_state.get("shelter_plan")
        shelters_assigned = shelter_plan is not None and len(shelter_plan.get("assigned_shelters") or []) > 0
        
        # Convert confidence score (0.0 - 1.0) to percentage
        confidence_val = final_state.get("confidence_score", 0.0)
        if 0.0 <= confidence_val <= 1.0:
            confidence_pct = int(round(confidence_val * 100))
        else:
            confidence_pct = int(round(confidence_val))
            
        logger.success("[ADCCGraph] Graph execution completed successfully.")
        
        return {
            "status": "success",
            "severity": final_state.get("severity_level", "Low"),
            "confidence": confidence_pct,
            "resources_allocated": resources_allocated,
            "shelters_assigned": shelters_assigned,
            "state": final_state
        }
        
    except Exception as e:
        logger.error(f"[ADCCGraph] Exception during graph execution: {e}")
        return {
            "status": "error",
            "error_message": str(e),
            "severity": "Unknown",
            "confidence": 0,
            "resources_allocated": False,
            "shelters_assigned": False
        }


if __name__ == "__main__":
    """
    Standalone verification run for the StateGraph workflow orchestration.
    Usage:
        cd disaster-ai
        $env:PYTHONPATH="."; python workflows/graph.py
    """
    import json
    
    logger.info("[ADCCGraph] Standalone workflow orchestration test starting...")
    
    # We pass coordinates for Guwahati to simulate local resource check
    test_input = {
        "latitude": 26.1445,
        "longitude": 91.7362,
        "location_label": "Guwahati Flood Zone",
        "country": "India"
    }
    
    result = run_graph(test_input)
    
    print("\n" + "="*60)
    print("STANDALONE ORCHESTRATION RESULT:")
    print("="*60)
    print(json.dumps({k: v for k, v in result.items() if k != "state"}, indent=2))
    print("\nVisited Nodes:")
    print(result.get("state", {}).get("metadata", {}).get("nodes_visited", []))
