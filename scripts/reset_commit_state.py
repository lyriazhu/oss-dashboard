#!/usr/bin/env python3
"""
Reset commit state to force full all-time re-extraction
This script removes the last_git_sync_at timestamp from state files,
forcing the next extraction to fetch all-time commit history.
"""

import json
from pathlib import Path

def reset_commit_state():
    """Reset commit state for all projects"""
    data_dir = Path(__file__).parent.parent / "data"
    
    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}")
        return
    
    projects_reset = 0
    
    for project_dir in data_dir.iterdir():
        if not project_dir.is_dir():
            continue
            
        state_file = project_dir / "_state.json"
        if not state_file.exists():
            continue
        
        try:
            with open(state_file, 'r') as f:
                state = json.load(f)
            
            # Remove last_git_sync_at to force full re-extraction
            if "commits" in state and "last_git_sync_at" in state["commits"]:
                old_timestamp = state["commits"]["last_git_sync_at"]
                state["commits"]["last_git_sync_at"] = None
                
                with open(state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                
                print(f"✅ Reset {project_dir.name}: removed timestamp {old_timestamp}")
                projects_reset += 1
            else:
                print(f"ℹ️  {project_dir.name}: no commit state to reset")
                
        except (json.JSONDecodeError, OSError) as e:
            print(f"⚠️  Error processing {project_dir.name}: {e}")
    
    print(f"\n{'='*60}")
    print(f"Reset complete! {projects_reset} project(s) will do full extraction.")
    print(f"{'='*60}")
    print("\nNext steps:")
    print("1. Run: cd scripts && python extract_github_data.py")
    print("2. The script will fetch all-time commit history for committers")
    print("3. Subsequent runs will be incremental (faster)")

if __name__ == "__main__":
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║         Reset Commit State for All-Time Extraction       ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    reset_commit_state()

# Made with Bob
