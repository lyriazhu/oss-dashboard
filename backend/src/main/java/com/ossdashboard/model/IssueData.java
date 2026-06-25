package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

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
    
    @JsonProperty("median_resolution_time_days")
    public Double medianResolutionTimeDays;

    @JsonProperty("issue_commenters")
    public List<IssueCommenter> issueCommenters;
    
    public List<MonthData> months;
    
    public List<YearData> years;
    
    @JsonProperty("extracted_at")
    public String extractedAt;

    public static class IssueCommenter {
        public String login;
        public String name;
        public String company;
        public String location;

        @JsonProperty("profile_url")
        public String profileUrl;

        @JsonProperty("comment_count")
        public Integer commentCount;
    }
    
    public static class MonthData {
        @JsonProperty("start_date")
        public String startDate;
        
        @JsonProperty("end_date")
        public String endDate;
        
        @JsonProperty("issue_count")
        public Integer issueCount;

        @JsonProperty("closed_issue_count")
        public Integer closedIssueCount;

        @JsonProperty("median_resolution_time_days")
        public Double medianResolutionTimeDays;
        
        public String month;
    }
    
    public static class YearData {
        public Integer year;
        
        @JsonProperty("issue_count")
        public Integer issueCount;
        
        @JsonProperty("closed_issue_count")
        public Integer closedIssueCount;
    }
}

// Made with Bob
