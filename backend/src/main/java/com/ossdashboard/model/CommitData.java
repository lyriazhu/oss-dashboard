package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Commit data for a project
 */
public class CommitData {
    @JsonProperty("total_commits")
    public Integer totalCommits;
    
    public List<QuarterData> quarters;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
    
    public static class QuarterData {
        @JsonProperty("start_date")
        public String startDate;
        
        @JsonProperty("end_date")
        public String endDate;
        
        @JsonProperty("commit_count")
        public Integer commitCount;
        
        public String quarter;
    }
}

// Made with Bob
