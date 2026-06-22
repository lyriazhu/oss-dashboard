package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Commit data for a project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommitData {
    @JsonProperty("total_commits")
    private Integer totalCommits;
    
    private List<QuarterData> quarters;
    
    @JsonProperty("extracted_at")
    private String extractedAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuarterData {
        @JsonProperty("start_date")
        private String startDate;
        
        @JsonProperty("end_date")
        private String endDate;
        
        @JsonProperty("commit_count")
        private Integer commitCount;
        
        private String quarter;
    }
}

// Made with Bob
