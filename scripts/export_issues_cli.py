#!/usr/bin/env python3
"""
Export GitHub issues data using GitHub CLI
This script uses gh CLI to export issue data and process it into the required format
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import statistics

def run_gh_command(args):
    """Run a gh CLI command and return the output"""
    try:
        result = subprocess.run(
            ['gh'] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {e}")
        print(f"stderr: {e.stderr}")
        return None
    except FileNotFoundError:
        print("Error: GitHub CLI (gh) not found. Please install it first:")
        print("  brew install gh  # on macOS")
        print("  https://cli.github.com/")
        sys.exit(1)

def export_issues_for_repo(owner, repo):
    """Export all issues for a repository using gh CLI"""
    print(f"📥 Fetching issues from {owner}/{repo}...")
    
    # Fetch all issues (open and closed) with relevant fields
    output = run_gh_command([
        'issue', 'list',
        '--repo', f'{owner}/{repo}',
        '--state', 'all',
        '--limit', '10000',  # Fetch up to 10000 issues
        '--json', 'number,title,state,createdAt,closedAt,labels'
    ])
    
    if not output:
        return []
    
    try:
        issues = json.loads(output)
        print(f"  ✓ Fetched {len(issues)} issues")
        return issues
    except json.JSONDecodeError as e:
        print(f"  ❌ Error parsing JSON: {e}")
        return []

def process_issues_data(issues, project_created_at):
    """Process issues into monthly and yearly aggregations"""
    
    # Initialize data structures
    month_data = defaultdict(lambda: {'issue_count': 0, 'closed_issue_count': 0, 'resolution_times': []})
    year_data = defaultdict(lambda: {'issue_count': 0, 'closed_issue_count': 0})
    
    total_open = 0
    total_closed = 0
    earliest_issue_year = None
    
    for issue in issues:
        # Parse created date
        created_at = datetime.fromisoformat(issue['createdAt'].replace('Z', '+00:00'))
        created_month = created_at.strftime('%Y-%m')
        created_year = created_at.year
        
        # Track earliest issue year
        if earliest_issue_year is None or created_year < earliest_issue_year:
            earliest_issue_year = created_year
        
        # Count by state
        if issue['state'] == 'OPEN':
            total_open += 1
        else:
            total_closed += 1
        
        # Aggregate by month (last 12 months)
        month_data[created_month]['issue_count'] += 1
        
        # Aggregate by year
        year_data[created_year]['issue_count'] += 1
        
        # Track closed issues and resolution times
        if issue['closedAt']:
            closed_at = datetime.fromisoformat(issue['closedAt'].replace('Z', '+00:00'))
            month_data[created_month]['closed_issue_count'] += 1
            year_data[created_year]['closed_issue_count'] += 1
            
            # Calculate resolution time
            resolution_days = (closed_at - created_at).total_seconds() / 86400
            month_data[created_month]['resolution_times'].append(resolution_days)
    
    # Get last 12 months
    now = datetime.now()
    last_12_months = []
    for i in range(11, -1, -1):
        month_date = datetime(now.year, now.month, 1)
        # Go back i months
        for _ in range(i):
            if month_date.month == 1:
                month_date = datetime(month_date.year - 1, 12, 1)
            else:
                month_date = datetime(month_date.year, month_date.month - 1, 1)
        
        month_label = month_date.strftime('%Y-%m')
        last_12_months.append(month_label)
    
    # Build months array
    months_array = []
    for month_label in last_12_months:
        data = month_data[month_label]
        month_info = {
            'start_date': f"{month_label}-01T00:00:00",
            'end_date': f"{month_label}-31T23:59:59",  # Simplified
            'issue_count': data['issue_count'],
            'closed_issue_count': data['closed_issue_count'],
            'month': month_label
        }
        
        # Add median resolution time if available
        if data['resolution_times']:
            month_info['median_resolution_time_days'] = round(statistics.median(data['resolution_times']), 2)
        
        months_array.append(month_info)
    
    # Build years array - include all years from earliest issue to current year
    years_array = []
    if earliest_issue_year is not None:
        current_year = datetime.now().year
        for year in range(earliest_issue_year, current_year + 1):
            years_array.append({
                'year': year,
                'issue_count': year_data[year]['issue_count'],
                'closed_issue_count': year_data[year]['closed_issue_count']
            })
    
    # Calculate overall median resolution time
    all_resolution_times = []
    for data in month_data.values():
        all_resolution_times.extend(data['resolution_times'])
    
    median_resolution = None
    if all_resolution_times:
        median_resolution = round(statistics.median(all_resolution_times), 2)
    
    return {
        'total_open': total_open,
        'total_closed': total_closed,
        'total_issues': total_open + total_closed,
        'median_resolution_time_days': median_resolution,
        'months': months_array,
        'years': years_array,
        'extracted_at': datetime.now().isoformat()
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 export_issues_cli.py <project_id>")
        print("Example: python3 export_issues_cli.py activemq")
        sys.exit(1)
    
    project_id = sys.argv[1]
    
    # Load projects configuration
    data_dir = Path(__file__).parent.parent / "data"
    projects_file = data_dir / "projects.json"
    
    with open(projects_file, 'r') as f:
        projects_data = json.load(f)
    
    # Find the project
    project = None
    for p in projects_data['projects']:
        if p['id'] == project_id:
            project = p
            break
    
    if not project:
        print(f"❌ Project '{project_id}' not found in projects.json")
        sys.exit(1)
    
    print(f"\n🚀 Exporting issues for: {project['name']}\n")
    
    # Get repository info
    owner = project['owner']
    repo = project['repo']
    
    # Export issues
    issues = export_issues_for_repo(owner, repo)
    
    if not issues:
        print("❌ No issues found or error occurred")
        sys.exit(1)
    
    # Get project created date from metadata
    project_dir_name = project_id.lower().replace('_', '-')
    if project_id == 'strimzi-kafka-operator':
        project_dir_name = 'strimzi'
    elif project_id == 'camel':
        project_dir_name = 'apache-camel'
    elif project_id == 'activemq':
        project_dir_name = 'apache-activemq'
    elif project_id == 'apicurio-studio':
        project_dir_name = 'apicurio'
    elif project_id == '3scale-operator':
        project_dir_name = '3scale'
    
    project_dir = data_dir / project_dir_name
    metadata_file = project_dir / "metadata.json"
    
    project_created_at = None
    if metadata_file.exists():
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
            project_created_at = metadata.get('created_at')
    
    # Process the data
    print("\n📊 Processing issue data...")
    issue_data = process_issues_data(issues, project_created_at)
    
    # Save to file
    output_file = project_dir / "issues.json"
    project_dir.mkdir(exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(issue_data, f, indent=2)
    
    print(f"\n✅ Saved issues data to {output_file}")
    print(f"📈 Total: {issue_data['total_issues']} issues ({issue_data['total_open']} open, {issue_data['total_closed']} closed)")
    if issue_data['median_resolution_time_days']:
        print(f"⏱️  Median resolution time: {issue_data['median_resolution_time_days']} days")

if __name__ == '__main__':
    main()

# Made with Bob
