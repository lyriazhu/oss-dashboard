package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Issue data for a project
 */
public class IssueData {
    @JsonProperty("total_open")
    public Integer totalOpen;
    
    @JsonProperty("total_closed")
    public Integer totalClosed;
    
    @JsonProperty("total_issues")
    public Integer totalIssues;
    
    @JsonProperty("avg_resolution_time_days")
    public Double avgResolutionTimeDays;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
}

// Made with Bob
