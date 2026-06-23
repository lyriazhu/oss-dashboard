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

    public List<Committer> committers;

    @JsonProperty("time_scope")
    public TimeScope timeScope;
    
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

    public static class Committer {
        public String login;
        public String name;
        public String company;
        public String location;
        public String email;

        @JsonProperty("profile_url")
        public String profileUrl;

        @JsonProperty("commit_count")
        public Integer commitCount;
    }

    public static class TimeScope {
        @JsonProperty("total_commits")
        public String totalCommits;

        public String quarters;
        public String committers;
    }
}

// Made with Bob
