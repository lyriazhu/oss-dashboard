package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Pull request data for a project
 */
public class PullRequestData {
    @JsonProperty("total_prs")
    public Integer totalPrs;

    @JsonProperty("avg_time_to_merge_days")
    public Double avgTimeToMergeDays;
    
    public List<QuarterData> quarters;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
    
    public static class QuarterData {
        @JsonProperty("start_date")
        public String startDate;
        
        @JsonProperty("end_date")
        public String endDate;
        
        @JsonProperty("pr_count")
        public Integer prCount;

        @JsonProperty("merged_pr_count")
        public Integer mergedPrCount;

        @JsonProperty("avg_time_to_merge_days")
        public Double avgTimeToMergeDays;
        
        public String quarter;
    }
}

// Made with Bob
