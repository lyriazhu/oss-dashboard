# All-Time Data Collection for Commits and Contributors

## Overview

The OSS Dashboard has been updated to collect **all-time commit and contributor data** instead of just the last 4 quarters. This provides a complete historical view of project activity while maintaining efficient incremental updates.

## What Changed

### Backend Changes (`scripts/extract_github_data.py`)

1. **Committer Data Collection** - Now collects all-time data:
   - `_extract_committers_from_git_history()` - Removed quarter-based filtering
   - Processes entire git history for committer statistics
   - Tracks all commits from project inception

2. **Commit Data Merging** - Enhanced for all-time tracking:
   - `_merge_commit_data()` - Updated to handle all-time committer data
   - Quarterly commit counts still maintained for visualization
   - Metadata updated to reflect "all_time_from_git_history"

3. **Incremental Updates** - Smart extraction logic:
   - First run: Fetches complete git history (slower, one-time)
   - Subsequent runs: Only fetches commits since last sync (fast)
   - Uses `last_git_sync_at` timestamp for efficiency

### Frontend Changes

1. **Overview.jsx** - Updated labels:
   - Section header now shows "committers all-time"

2. **Detail.jsx** - Enhanced clarity:
   - Chart captions indicate "(committers all-time)"
   - Company section header shows "(all-time)"

## How to Use

### Initial Setup (Force Full Re-extraction)

If you have existing data and want to re-extract with all-time history:

```bash
# Step 1: Reset commit state (removes timestamps)
cd /Users/lyriazhu/Desktop/oss-dashboard
python3 scripts/reset_commit_state.py

# Step 2: Run full extraction (will take longer)
cd scripts
python3 extract_github_data.py
```

### Regular Updates (Incremental)

After the initial full extraction, regular updates are fast:

```bash
cd scripts
python3 extract_github_data.py
```

The script automatically detects existing data and only fetches new commits.

## What Gets Collected

### All-Time Data
- ✅ **Committers**: All contributors who have ever committed
- ✅ **Commit counts per committer**: Total commits across project history
- ✅ **Company affiliations**: Based on email domains and GitHub profiles
- ✅ **Contributors**: All GitHub contributors (already was all-time)
- ✅ **Yearly commit counts**: Commits aggregated by year (all years)
- ✅ **Yearly contributor counts**: Unique contributors per year (all years)

### Time-Windowed Data (Still Quarterly)
- 📊 **Quarterly commit counts**: Last 4 quarters for visualization
- 📊 **Retention metrics**: Last 6 months of contributor activity
- 📊 **Pull requests**: Last 4 quarters
- 📊 **Issues**: Current open/closed counts

## Performance Considerations

### First Run (Full Extraction)
- **Time**: 5-15 minutes per project (depends on repo size)
- **What happens**: 
  - Clones/updates git repository mirror
  - Processes entire commit history
  - Fetches GitHub API data for quarters
  - Enriches user profiles

### Subsequent Runs (Incremental)
- **Time**: 1-3 minutes per project
- **What happens**:
  - Fetches only new commits since last sync
  - Updates quarterly metrics
  - Merges with existing all-time data

## Data Storage

### State Files (`data/*/\_state.json`)
Tracks extraction state for incremental updates:
```json
{
  "commits": {
    "last_git_sync_at": "2026-06-23T23:09:04.434959"
  },
  "contributors": {
    "known_logins": [...],
    "last_extracted_at": "2026-06-23T23:09:01.168708"
  }
}
```

### Commit Data (`data/*/commits.json`)
Contains all-time committer data:
```json
{
  "total_commits": 649,
  "quarters": [...],  // Last 4 quarters
  "committers": [...], // All-time committers
  "time_scope": {
    "total_commits": "last_4_quarters",
    "quarters": "last_4_quarters",
    "committers": "all_time_from_git_history"
  }
}
```

## Troubleshooting

### Issue: Data not updating after code changes
**Solution**: Run the reset script to force full re-extraction:
```bash
python3 scripts/reset_commit_state.py
```

### Issue: Extraction taking too long
**Cause**: First-time extraction processes entire history
**Solution**: This is normal. Subsequent runs will be much faster.

### Issue: Missing committers
**Cause**: Git history not fully synced
**Solution**: Delete `.cache/repos/` directory and re-run extraction

### Issue: Duplicate committers
**Cause**: Same person with different email addresses
**Solution**: The system uses email/identity matching. Consider implementing email alias mapping if needed.

## Benefits

1. **Complete Historical View**: See all contributors who have ever participated
2. **Better Company Analysis**: Accurate company contribution percentages across project lifetime
3. **Efficient Updates**: After initial extraction, updates are fast and incremental
4. **No Data Loss**: Existing quarterly data is preserved for visualization
5. **Backward Compatible**: Works with existing data files through merging

## Technical Details

### Git History Processing
- Uses local git mirror (`.cache/repos/`) for fast access
- Processes commits with: `git log --all --pretty=format:%H|%ae|%an|%aI`
- Tracks by email/identity for accurate committer counting

### Incremental Update Logic
```python
if existing_data and last_git_sync_at:
    # Incremental: fetch only new commits
    new_history_rows = self._read_git_history_rows(owner, repo, since=last_git_sync_at)
else:
    # Initial: fetch all history
    new_history_rows = self._read_git_history_rows(owner, repo)
```

### Data Merging
- Existing committers are preserved
- New commits are added to existing counts
- Quarterly data is refreshed from GitHub API
- All-time committer list grows over time

## Future Enhancements

Potential improvements for consideration:
- Email alias mapping for better committer deduplication
- Configurable time windows (e.g., last 8 quarters, last year)
- Historical trend analysis (commits per year/quarter over time)
- Company affiliation history tracking

## Support

For issues or questions:
1. Check the console output for error messages
2. Verify GitHub token has sufficient rate limit
3. Ensure git is installed and accessible
4. Review state files for corruption

---

**Last Updated**: June 24, 2026  
**Version**: 2.0 (All-Time Data Collection)