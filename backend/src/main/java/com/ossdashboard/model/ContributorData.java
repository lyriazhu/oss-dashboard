package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Contributor data for a project
 */
public class ContributorData {
    @JsonProperty("total_contributors")
    public Integer totalContributors;
    
    public List<Contributor> contributors;
    public Map<String, Integer> companies;
    
    @JsonProperty("total_companies")
    public Integer totalCompanies;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
    
    public static class Contributor {
        public String login;
        public String name;
        public String company;
        public String location;
        public String email;
        public Integer contributions;
        
        @JsonProperty("profile_url")
        public String profileUrl;
    }
}

// Made with Bob
