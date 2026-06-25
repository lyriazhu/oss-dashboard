package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Commit data for a project
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class CommitData {
    @JsonProperty("total_commits")
    public Integer totalCommits;
    
    public List<QuarterData> quarters;

    public List<Committer> committers;
    
    public List<YearData> years;

    @JsonProperty("time_scope")
    public TimeScope timeScope;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QuarterData {
        @JsonProperty("start_date")
        public String startDate;
        
        @JsonProperty("end_date")
        public String endDate;
        
        @JsonProperty("commit_count")
        public Integer commitCount;
        
        public String quarter;
    }
    
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class YearData {
        public Integer year;
        
        @JsonProperty("commit_count")
        public Integer commitCount;
        
        @JsonProperty("is_current")
        public Boolean isCurrent;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TimeScope {
        @JsonProperty("total_commits")
        public String totalCommits;

        public String quarters;
        public String committers;
        public String years;
    }
}

// Made with Bob
