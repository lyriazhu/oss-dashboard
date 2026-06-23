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

    @JsonProperty("retention_by_quarter")
    public List<RetentionQuarter> retentionByQuarter;

    @JsonProperty("company_diversity")
    public CompanyDiversity companyDiversity;
    
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

    public static class RetentionQuarter {
        public String quarter;

        @JsonProperty("start_date")
        public String startDate;

        @JsonProperty("end_date")
        public String endDate;

        @JsonProperty("active_contributors")
        public Integer activeContributors;

        @JsonProperty("new_contributors")
        public Integer newContributors;

        @JsonProperty("returning_contributors")
        public Integer returningContributors;

        @JsonProperty("retention_rate")
        public Double retentionRate;
    }

    public static class CompanyDiversity {
        @JsonProperty("known_company_contributors")
        public Integer knownCompanyContributors;

        @JsonProperty("unknown_company_contributors")
        public Integer unknownCompanyContributors;

        @JsonProperty("top_companies")
        public List<CompanyCount> topCompanies;
    }

    public static class CompanyCount {
        public String company;

        @JsonProperty("contributor_count")
        public Integer contributorCount;
    }
}

// Made with Bob
