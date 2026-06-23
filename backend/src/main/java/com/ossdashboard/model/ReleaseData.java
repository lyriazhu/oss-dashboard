package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Release data for a project
 */
public class ReleaseData {
    @JsonProperty("total_releases")
    public Integer totalReleases;
    
    @JsonProperty("recent_releases")
    public List<Release> recentReleases;

    @JsonProperty("avg_days_between_releases")
    public Double avgDaysBetweenReleases;

    @JsonProperty("release_frequency")
    public String releaseFrequency;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
    
    public static class Release {
        @JsonProperty("tag_name")
        public String tagName;
        
        public String name;
        
        @JsonProperty("published_at")
        public String publishedAt;
        
        public Boolean prerelease;
        public Boolean draft;
    }
}

// Made with Bob
