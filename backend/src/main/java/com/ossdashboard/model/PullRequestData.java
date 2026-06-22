package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Pull request data for a project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PullRequestData {
    @JsonProperty("total_prs")
    private Integer totalPrs;
    
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
        
        @JsonProperty("pr_count")
        private Integer prCount;
        
        private String quarter;
    }
}

// Made with Bob
