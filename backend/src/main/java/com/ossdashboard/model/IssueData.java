package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Issue data for a project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueData {
    @JsonProperty("total_open")
    private Integer totalOpen;
    
    @JsonProperty("total_closed")
    private Integer totalClosed;
    
    @JsonProperty("total_issues")
    private Integer totalIssues;
    
    @JsonProperty("avg_resolution_time_days")
    private Double avgResolutionTimeDays;
    
    @JsonProperty("extracted_at")
    private String extractedAt;
}

// Made with Bob
