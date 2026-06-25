package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Pull request data for a project
 */
public class PullRequestData {
    @JsonProperty("total_prs")
    public Integer totalPrs;

    @JsonProperty("median_time_to_merge_days")
    public Double medianTimeToMergeDays;
    
    public List<QuarterData> quarters;
    
    public List<MonthData> months;
    
    public List<YearData> years;
    
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
    
    public static class MonthData {
        @JsonProperty("start_date")
        public String startDate;
        
        @JsonProperty("end_date")
        public String endDate;
        
        @JsonProperty("pr_count")
        public Integer prCount;

        @JsonProperty("merged_pr_count")
        public Integer mergedPrCount;

        @JsonProperty("median_time_to_merge_days")
        public Double medianTimeToMergeDays;
        
        public String month;
    }
    
    public static class YearData {
        public Integer year;
        
        @JsonProperty("pr_count")
        public Integer prCount;
        
        @JsonProperty("merged_pr_count")
        public Integer mergedPrCount;
    }
}

// Made with Bob
