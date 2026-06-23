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
    
    @JsonProperty("avg_resolution_time_days")
    public Double avgResolutionTimeDays;

    @JsonProperty("issue_commenters")
    public List<IssueCommenter> issueCommenters;
    
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
}

// Made with Bob
